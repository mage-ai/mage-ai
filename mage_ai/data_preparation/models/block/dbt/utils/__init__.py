from contextlib import redirect_stdout
from datetime import datetime
from jinja2 import Template
from logging import Logger
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.sql import (
    bigquery,
    execute_sql_code as execute_sql_code_orig,
    mssql,
    mysql,
    postgres,
    redshift,
    snowflake,
    spark,
    trino,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.io.base import DataSource, ExportWritePolicy
from mage_ai.io.config import ConfigFileLoader
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.strings import remove_extension_from_filename
from mage_ai.shared.utils import clean_name, files_in_path
from pandas import DataFrame
from typing import Callable, Dict, List, Tuple
import aiofiles
import os
import re
import shutil
import simplejson
import subprocess
import sys
import uuid
import yaml


PROFILES_FILE_NAME = 'profiles.yml'


def parse_attributes(block) -> Dict:
    configuration = block.configuration

    file_path = configuration['file_path']
    path_parts = file_path.split(os.sep)
    project_name = path_parts[0]
    filename = path_parts[-1]
    model_name = None
    file_extension = None

    parts = filename.split('.')
    if len(parts) >= 2:
        model_name = '.'.join(parts[:-1])
        file_extension = parts[-1]

    # Check the model SQL file content for a config with an alias value. If it exists,
    # use that alias value as the table name instead of the model’s name.
    table_name = model_name
    config = model_config(block.content)
    if config.get('alias'):
        table_name = config['alias']

    full_path = os.path.join(get_repo_path(), 'dbt', file_path)

    project_full_path = os.path.join(get_repo_path(), 'dbt', project_name)

    models_folder_path = os.path.join(project_full_path, 'models')
    sources_full_path = os.path.join(models_folder_path, 'mage_sources.yml')
    sources_full_path_legacy = full_path.replace(filename, 'mage_sources.yml')

    profiles_full_path = os.path.join(project_full_path, PROFILES_FILE_NAME)
    profile_target = configuration.get('dbt_profile_target')
    profile = load_profile(project_name, profiles_full_path, profile_target)

    dbt_project_full_path = os.path.join(project_full_path, 'dbt_project.yml')

    source_name = f'mage_{project_name}'
    if profile:
        if (DataSource.MYSQL == profile.get('type') or
                DataSource.REDSHIFT == profile.get('type') or
                DataSource.TRINO == profile.get('type') or
                DataSource.MSSQL == profile.get('type') or
                DataSource.SPARK == profile.get('type')):
            source_name = profile['schema']

    return dict(
        dbt_project_full_path=dbt_project_full_path,
        file_extension=file_extension,
        file_path=file_path,
        filename=filename,
        full_path=full_path,
        model_name=model_name,
        models_folder_path=models_folder_path,
        profiles_full_path=profiles_full_path,
        project_full_path=project_full_path,
        project_name=project_name,
        source_name=source_name,
        sources_full_path=sources_full_path,
        sources_full_path_legacy=sources_full_path_legacy,
        table_name=table_name,
    )


def extract_refs(block_content) -> List[str]:
    return re.findall(
        r"{}[ ]*ref\(['\"]+([\w]+)['\"]+\)[ ]*{}".format(r'\{\{', r'\}\}'),
        block_content,
    )


def extract_sources(block_content) -> List[Tuple[str, str]]:
    return re.findall(
        r"{}[ ]*source\(['\"]+([\w]+)['\"]+[,]+[ ]*['\"]+([\w]+)['\"]+\)[ ]*{}".format(
            r'\{\{',
            r'\}\}',
        ),
        block_content,
    )


def add_blocks_upstream_from_refs(
    block: 'Block',
    add_current_block: bool = False,
    downstream_blocks: List['Block'] = [],
    read_only: bool = False,
) -> None:
    attributes_dict = parse_attributes(block)
    models_folder_path = attributes_dict['models_folder_path']

    files_by_name = {}
    for file_path_orig in files_in_path(models_folder_path):
        file_path = file_path_orig.replace(f'{models_folder_path}{os.sep}', '')
        filename = file_path.split(os.sep)[-1]
        parts = filename.split('.')
        if len(parts) >= 2:
            fn = '.'.join(parts[:-1])
            file_extension = parts[-1]
            if 'sql' == file_extension:
                files_by_name[fn] = file_path_orig

    current_upstream_blocks = []
    added_blocks = []
    for idx, ref in enumerate(extract_refs(block.content)):
        if ref not in files_by_name:
            print(f'WARNING: dbt model {ref} cannot be found.')
            continue

        fp = files_by_name[ref].replace(f"{os.path.join(get_repo_path(), 'dbt')}{os.sep}", '')
        configuration = dict(file_path=fp)
        uuid = remove_extension_from_filename(fp)

        if read_only:
            uuid_clean = clean_name(uuid, allow_characters=[os.sep])
            new_block = block.__class__(uuid_clean, uuid_clean, block.type)
            new_block.configuration = configuration
            new_block.language = block.language
            new_block.pipeline = block.pipeline
            new_block.downstream_blocks = [block]
            new_block.upstream_blocks = add_blocks_upstream_from_refs(
                new_block,
                read_only=read_only,
            )
            added_blocks += new_block.upstream_blocks
        else:
            new_block = block.__class__.create(
                uuid,
                block.type,
                get_repo_path(),
                configuration=configuration,
                language=block.language,
                pipeline=block.pipeline,
            )

        added_blocks.append(new_block)
        current_upstream_blocks.append(new_block)

    if add_current_block:
        arr = []
        for b in current_upstream_blocks:
            arr.append(b)
        block.upstream_blocks = arr
        added_blocks.append(block)

    return added_blocks


def get_source(block) -> Dict:
    attributes_dict = parse_attributes(block)
    source_name = attributes_dict['source_name']
    settings = load_sources(block)
    return find(lambda x: x['name'] == source_name, settings.get('sources', []))


def load_sources(block) -> Dict:
    attributes_dict = parse_attributes(block)
    sources_full_path = attributes_dict['sources_full_path']
    sources_full_path_legacy = attributes_dict['sources_full_path_legacy']

    settings = None
    if os.path.exists(sources_full_path):
        with open(sources_full_path, 'r') as f:
            settings = yaml.safe_load(f) or dict(sources=[], version=2)

    if os.path.exists(sources_full_path_legacy):
        print(f'Legacy dbt source file exists at {sources_full_path_legacy}.')

        with open(sources_full_path_legacy, 'r') as f:
            sources_legacy = yaml.safe_load(f) or dict(sources=[], version=2)

            for source_data in sources_legacy.get('sources', []):
                source_name = source_data['name']
                for table_data in source_data['tables']:
                    table_name = table_data['name']
                    print(f'Adding source {source_name} and table {table_name} '
                          f'to {sources_full_path}.')
                    settings = add_table_to_source(block, settings, source_name, table_name)

            with open(sources_full_path_legacy, 'w') as f:
                print(f'Deleting legacy dbt source file at {sources_full_path_legacy}.')
                yaml.safe_dump(settings, f)

        os.remove(sources_full_path_legacy)

    return settings


def source_table_name_for_block(block) -> str:
    return f'{clean_name(block.pipeline.uuid)}_{clean_name(block.uuid)}'


def update_model_settings(
    block: 'Block',
    upstream_blocks: List['Block'],
    upstream_blocks_previous: List['Block'],
    force_update: bool = False,
):
    attributes_dict = parse_attributes(block)

    sources_full_path = attributes_dict['sources_full_path']
    source_name = attributes_dict['source_name']

    if not force_update and len(upstream_blocks_previous) > len(upstream_blocks):
        # TODO (tommy dangerous): should we remove sources?
        # How do we know no other model is using a source?

        # uuids = [b.uuid for b in upstream_blocks]
        # for upstream_block in upstream_blocks_previous:
        #     if upstream_block.uuid in uuids:
        #         continue

        #     # If upstream block that’s being removed has a downstream block that is a DBT block
        #     if any([block.type == b.type for b in upstream_block.downstream_blocks]):
        #         continue

        #     if os.path.exists(sources_full_path):
        #         with open(sources_full_path, 'r') as f:
        #             settings = yaml.safe_load(f) or {}
        #             source = find(lambda x: x['name'] == source_name, settings.get('sources', []))
        #             table_name = f'{upstream_block.pipeline.uuid}_{upstream_block.uuid}'
        #             if source:
        #                 source['tables'] = list(
        #                     filter(
        #                         lambda x: x['name'] != table_name,
        #                         source.get('tables', []),
        #                     ),
        #                 )

        #         with open(sources_full_path, 'w') as f:
        #             yaml.safe_dump(settings, f)
        pass
    elif upstream_blocks:
        for upstream_block in upstream_blocks:
            if block.type == upstream_block.type:
                continue

            table_name = source_table_name_for_block(upstream_block)
            settings = add_table_to_source(block, load_sources(block), source_name, table_name)

            with open(sources_full_path, 'w') as f:
                yaml.safe_dump(settings, f)


def add_table_to_source(block: 'Block', settings: Dict, source_name: str, table_name: str) -> None:
    new_table = dict(name=table_name)
    new_source = dict(
        name=source_name,
        tables=[
            new_table,
        ],
    )

    if settings:
        source = find(lambda x: x['name'] == source_name, settings.get('sources', []))
        if source:
            if not source.get('tables'):
                source['tables'] = []
            if table_name not in [x['name'] for x in source['tables']]:
                source['tables'].append(new_table)
        else:
            settings['sources'].append(new_source)

    else:
        settings = dict(
            version=2,
            sources=[
                new_source,
            ],
        )

    return settings


def load_profiles_file(profiles_full_path: str) -> Dict:
    try:
        with open(profiles_full_path, 'r') as f:
            try:
                text = Template(f.read()).render(
                    **get_template_vars(),
                )
                return yaml.safe_load(text)
            except Exception as err:
                print(
                    f'Error loading file {profiles_full_path}, check file content syntax: {err}.',
                )
                return {}
    except OSError as err:
        print(
            f'Error loading file {profiles_full_path}, check file content syntax: {err}.',
        )
        return {}


async def load_profiles_file_async(profiles_full_path: str) -> Dict:
    try:
        async with aiofiles.open(profiles_full_path, mode='r') as fp:
            try:
                file_content = await fp.read()
                text = Template(file_content).render(
                    **get_template_vars(),
                )
                return yaml.safe_load(text)
            except Exception as err:
                print(
                    f'Error loading file {profiles_full_path}, check file content syntax: {err}.',
                )
                return {}
    except OSError as err:
        print(
            f'Error loading file {profiles_full_path}, check file content syntax: {err}.',
        )
        return {}


def load_profiles(project_name: str, profiles_full_path: str) -> Dict:
    profiles = load_profiles_file(profiles_full_path)

    if not profiles or project_name not in profiles:
        print(f'Project name {project_name} does not exist in profile file {profiles_full_path}.')
        return {}

    return profiles[project_name]


async def load_profiles_async(project_name: str, profiles_full_path: str) -> Dict:
    profiles = await load_profiles_file_async(profiles_full_path)

    if not profiles or project_name not in profiles:
        print(f'Project name {project_name} does not exist in profile file {profiles_full_path}.')
        return {}

    return profiles[project_name]


def load_profile(
    project_name: str,
    profiles_full_path: str,
    profile_target: str = None,
) -> Dict:

    profile = load_profiles(project_name, profiles_full_path)
    outputs = profile.get('outputs', {})
    target = profile.get('target', None)

    return outputs.get(profile_target or target)


def get_profile(block, profile_target: str = None) -> Dict:
    attr = parse_attributes(block)
    project_name = attr['project_name']
    profiles_full_path = attr['profiles_full_path']

    return load_profile(project_name, profiles_full_path, profile_target)


def config_file_loader_and_configuration(block, profile_target: str) -> Dict:
    profile = get_profile(block, profile_target)

    if not profile:
        raise Exception(
            f'No profile target named {profile_target}, check the {PROFILES_FILE_NAME} file.',
        )
    profile_type = profile.get('type')

    config_file_loader = None
    configuration = None

    if DataSource.POSTGRES == profile_type:
        database = profile.get('dbname')
        host = profile.get('host')
        password = profile.get('password')
        port = profile.get('port')
        schema = profile.get('schema')
        user = profile.get('user')

        config_file_loader = ConfigFileLoader(config=dict(
            POSTGRES_DBNAME=database,
            POSTGRES_HOST=host,
            POSTGRES_PASSWORD=password,
            POSTGRES_PORT=port,
            POSTGRES_SCHEMA=schema,
            POSTGRES_USER=user,
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=database,
            data_provider_schema=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    elif DataSource.BIGQUERY == profile_type:
        keyfile = profile.get('keyfile')
        database = profile.get('project')
        schema = profile.get('dataset')

        config_file_loader = ConfigFileLoader(config=dict(
            GOOGLE_SERVICE_ACC_KEY_FILEPATH=keyfile,
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=database,
            data_provider_schema=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    elif DataSource.MSSQL == profile_type:
        config_file_loader = ConfigFileLoader(config=dict(
            MSSQL_DATABASE=profile.get('database'),
            MSSQL_DRIVER=profile.get('driver'),
            MSSQL_HOST=profile.get('server'),
            MSSQL_PASSWORD=profile.get('password'),
            MSSQL_PORT=profile.get('port'),
            MSSQL_USER=profile.get('user'),
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=profile.get('database'),
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    elif DataSource.MYSQL == profile_type:
        host = profile.get('server')
        password = profile.get('password')
        port = profile.get('port')
        schema = profile.get('schema')
        ssl_disabled = profile.get('ssl_disabled')
        username = profile.get('username')

        config_file_loader = ConfigFileLoader(config=dict(
            MYSQL_CONNECTION_METHOD='ssh_tunnel' if not ssl_disabled else None,
            MYSQL_DATABASE=schema,
            MYSQL_HOST=host,
            MYSQL_PASSWORD=password,
            MYSQL_PORT=port,
            MYSQL_USER=username,
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    elif DataSource.REDSHIFT == profile_type:
        database = profile.get('dbname')
        host = profile.get('host')
        password = profile.get('password')
        port = profile.get('port', 5439)
        schema = profile.get('schema')
        user = profile.get('user')

        config_file_loader = ConfigFileLoader(config=dict(
            REDSHIFT_DBNAME=database,
            REDSHIFT_HOST=host,
            REDSHIFT_PORT=port,
            REDSHIFT_SCHEMA=schema,
            REDSHIFT_TEMP_CRED_PASSWORD=password,
            REDSHIFT_TEMP_CRED_USER=user,
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=database,
            data_provider_schema=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    elif DataSource.SNOWFLAKE == profile_type:
        database = profile.get('database')
        schema = profile.get('schema')
        config = dict(
            SNOWFLAKE_ACCOUNT=profile.get('account'),
            SNOWFLAKE_DEFAULT_DB=profile.get('database'),
            SNOWFLAKE_DEFAULT_SCHEMA=profile.get('schema'),
            SNOWFLAKE_DEFAULT_WH=profile.get('warehouse'),
            SNOWFLAKE_USER=profile.get('user'),
        )

        if 'password' in profile:
            config['SNOWFLAKE_PASSWORD'] = profile['password']
        if 'private_key_passphrase' in profile:
            config['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = profile['private_key_passphrase']
        if 'private_key_path' in profile:
            config['SNOWFLAKE_PRIVATE_KEY_PATH'] = profile['private_key_path']

        config_file_loader = ConfigFileLoader(config=config)
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=database,
            data_provider_schema=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    elif DataSource.SPARK == profile_type:
        schema = profile.get('schema')

        config = dict(
            SPARK_METHOD=profile.get('method'),
            SPARK_HOST=profile.get('host'),
            SPARK_SCHEMA=profile.get('schema'),
        )

        config_file_loader = ConfigFileLoader(config=config)
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )
    elif DataSource.TRINO == profile_type:
        catalog = profile.get('database')
        schema = profile.get('schema')

        config_file_loader = ConfigFileLoader(config=dict(
            TRINO_CATALOG=catalog,
            TRINO_HOST=profile.get('host'),
            TRINO_PASSWORD=profile.get('password'),
            TRINO_PORT=profile.get('port'),
            TRINO_SCHEMA=schema,
            TRINO_USER=profile.get('user'),
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=catalog,
            data_provider_schema=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )

    if not config_file_loader or not configuration:
        attr = parse_attributes(block)
        profiles_full_path = attr['profiles_full_path']

        msg = (f'No configuration matching profile type {profile_type}. '
               f'Change your target in {profiles_full_path} '
               'or add dbt_profile_target to your global variables.')
        raise Exception(msg)

    return config_file_loader, configuration


def execute_sql_code(
    block,
    query: str,
    profile_target: str,
    **kwargs,
):
    config_file_loader, configuration = config_file_loader_and_configuration(
        block,
        profile_target,
    )

    return execute_sql_code_orig(
        block,
        query,
        config_file_loader=config_file_loader,
        configuration=configuration,
        **kwargs,
    )


def create_upstream_tables(
    block,
    profile_target: str,
    cache_upstream_dbt_models: bool = False,
    **kwargs,
) -> None:
    if len([b for b in block.upstream_blocks if BlockType.SENSOR != b.type]) == 0:
        return

    config_file_loader, configuration = config_file_loader_and_configuration(
        block,
        profile_target,
    )

    data_provider = configuration.get('data_provider')

    kwargs_shared = merge_dict(dict(
        configuration=configuration,
        cache_upstream_dbt_models=cache_upstream_dbt_models,
    ), kwargs)

    upstream_blocks_init = block.upstream_blocks
    upstream_blocks = upstream_blocks_from_sources(block)
    block.upstream_blocks = upstream_blocks

    if DataSource.POSTGRES == data_provider:
        from mage_ai.io.postgres import Postgres

        with Postgres.with_config(config_file_loader) as loader:
            postgres.create_upstream_block_tables(
                loader,
                block,
                cascade_on_drop=True,
                **kwargs_shared,
            )
    elif DataSource.MSSQL == data_provider:
        from mage_ai.io.mssql import MSSQL

        with MSSQL.with_config(config_file_loader) as loader:
            mssql.create_upstream_block_tables(
                loader,
                block,
                cascade_on_drop=False,
                **kwargs_shared,
            )
    elif DataSource.MYSQL == data_provider:
        from mage_ai.io.mysql import MySQL

        with MySQL.with_config(config_file_loader) as loader:
            mysql.create_upstream_block_tables(
                loader,
                block,
                cascade_on_drop=True,
                **kwargs_shared,
            )
    elif DataSource.BIGQUERY == data_provider:
        from mage_ai.io.bigquery import BigQuery

        loader = BigQuery.with_config(config_file_loader)
        bigquery.create_upstream_block_tables(
            loader,
            block,
            configuration=configuration,
            cache_upstream_dbt_models=cache_upstream_dbt_models,
            **kwargs,
        )
    elif DataSource.REDSHIFT == data_provider:
        from mage_ai.io.redshift import Redshift

        with Redshift.with_config(config_file_loader) as loader:
            redshift.create_upstream_block_tables(
                loader,
                block,
                cascade_on_drop=True,
                **kwargs_shared,
            )
    elif DataSource.SNOWFLAKE == data_provider:
        from mage_ai.io.snowflake import Snowflake

        with Snowflake.with_config(config_file_loader) as loader:
            snowflake.create_upstream_block_tables(
                loader,
                block,
                **kwargs_shared,
            )
    elif DataSource.SPARK == data_provider:
        from mage_ai.io.spark import Spark

        loader = Spark.with_config(config_file_loader)
        spark.create_upstream_block_tables(
            loader,
            block,
            **kwargs_shared,
        )
    elif DataSource.TRINO == data_provider:
        from mage_ai.io.trino import Trino

        with Trino.with_config(config_file_loader) as loader:
            trino.create_upstream_block_tables(
                loader,
                block,
                **kwargs_shared,
            )

    block.upstream_blocks = upstream_blocks_init


def interpolate_input(
    block,
    query: str,
    configuration: Dict,
    profile_database: str,
    profile_schema: str,
    quote_str: str = '',
    replace_func=None,
) -> str:
    def __quoted(name):
        return quote_str + name + quote_str

    def __replace_func(db, schema, tn):
        if replace_func:
            return replace_func(db, schema, tn)

        if db and not schema:
            return f'{__quoted(db)}.{__quoted(tn)}'

        return f'{__quoted(schema)}.{__quoted(tn)}'

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if BlockType.DBT != upstream_block.type:
            continue

        attrs = parse_attributes(upstream_block)
        table_name = attrs['table_name']

        arr = []
        if profile_database:
            arr.append(__quoted(profile_database))
        if profile_schema:
            arr.append(__quoted(profile_schema))
        if table_name:
            arr.append(__quoted(table_name))
        matcher1 = '.'.join(arr)

        database = configuration.get('data_provider_database')
        schema = configuration.get('data_provider_schema')
        table_name = upstream_block.table_name

        query = query.replace(
            matcher1,
            __replace_func(database, schema, table_name),
        )

    return query


def interpolate_refs_with_table_names(
    query_string: str,
    block: Block,
    profile_target: str,
    configuration: Dict,
):
    profile = get_profile(block, profile_target)

    profile_type = profile.get('type')
    quote_str = ''
    if DataSource.POSTGRES == profile_type:
        database = profile['dbname']
        schema = profile['schema']
        quote_str = '"'
    elif DataSource.MSSQL == profile_type:
        database = configuration['data_provider_database']
        schema = None
        quote_str = '`'
    elif DataSource.MYSQL == profile_type:
        database = configuration['data_provider_database']
        schema = None
        quote_str = '`'
    elif DataSource.BIGQUERY == profile_type:
        database = profile['project']
        schema = profile['dataset']
        quote_str = '`'
    elif DataSource.REDSHIFT == profile_type:
        database = profile['dbname']
        schema = profile['schema']
        quote_str = '"'
    elif DataSource.SNOWFLAKE == profile_type:
        database = profile['database']
        schema = profile['schema']
    elif DataSource.SPARK == profile_type:
        database = profile['schema']
        schema = None
    elif DataSource.TRINO == profile_type:
        database = profile['catalog']
        schema = profile['schema']

    return interpolate_input(
        block,
        query_string,
        configuration=configuration,
        profile_database=database,
        profile_schema=schema,
        quote_str=quote_str,
    )


def compiled_query_string(block: Block) -> str:
    attr = parse_attributes(block)

    project_full_path = attr['project_full_path']
    file_path = attr['file_path']

    file = os.path.join(project_full_path, 'target', 'compiled', file_path)

    if not os.path.exists(file):
        return None

    with open(file, 'r') as f:
        query_string = f.read()

        # TODO (tommy dang): this was needed because we didn’t want to create model tables and
        # so we’d create a table to store the model results without creating the model.
        # However, we’re requiring people to run the model and create the model table to use ref.
        # query_string = interpolate_refs_with_table_names(
        #     query_string,
        #     block,
        #     profile_target=profile_target,
        #     configuration=configuration,
        # )

    return query_string


def execute_query(
    block,
    profile_target: str,
    query_string: str,
    limit: int = None,
) -> DataFrame:
    config_file_loader, configuration = config_file_loader_and_configuration(
        block,
        profile_target,
    )

    data_provider = configuration['data_provider']

    shared_kwargs = {}
    if limit is not None:
        shared_kwargs['limit'] = limit

    if DataSource.POSTGRES == data_provider:
        from mage_ai.io.postgres import Postgres

        with Postgres.with_config(config_file_loader) as loader:
            return loader.load(query_string, **shared_kwargs)
    elif DataSource.MSSQL == data_provider:
        from mage_ai.io.mssql import MSSQL

        with MSSQL.with_config(config_file_loader) as loader:
            return loader.load(query_string, **shared_kwargs)
    elif DataSource.MYSQL == data_provider:
        from mage_ai.io.mysql import MySQL

        with MySQL.with_config(config_file_loader) as loader:
            return loader.load(query_string, **shared_kwargs)
    elif DataSource.BIGQUERY == data_provider:
        from mage_ai.io.bigquery import BigQuery

        loader = BigQuery.with_config(config_file_loader)
        return loader.load(query_string, **shared_kwargs)
    elif DataSource.REDSHIFT == data_provider:
        from mage_ai.io.redshift import Redshift

        with Redshift.with_config(config_file_loader) as loader:
            return loader.load(query_string, **shared_kwargs)
    elif DataSource.SNOWFLAKE == data_provider:
        from mage_ai.io.snowflake import Snowflake

        with Snowflake.with_config(config_file_loader) as loader:
            return loader.load(query_string, **shared_kwargs)
    elif DataSource.SPARK == data_provider:
        from mage_ai.io.spark import Spark

        loader = Spark.with_config(config_file_loader)
        return loader.load(query_string, **shared_kwargs)
    elif DataSource.TRINO == data_provider:
        from mage_ai.io.trino import Trino

        with Trino.with_config(config_file_loader) as loader:
            return loader.load(query_string, **shared_kwargs)


def query_from_compiled_sql(block, profile_target: str, limit: int = None) -> DataFrame:
    query_string = compiled_query_string(block)

    return execute_query(block, profile_target, query_string, limit)


def build_command_line_arguments(
    block,
    variables: Dict,
    run_settings: Dict = None,
    run_tests: bool = False,
    test_execution: bool = False,
) -> Tuple[str, List[str], Dict]:
    variables = merge_dict(
        variables or {},
        get_global_variables(block.pipeline.uuid) if block.pipeline else {},
    )
    dbt_command = 'run'

    if run_tests:
        dbt_command = 'test'

    if run_settings:
        if run_settings.get('build_model'):
            dbt_command = 'build'
        elif run_settings.get('test_model'):
            dbt_command = 'test'

    variables_json = {}
    for k, v in variables.items():
        if PIPELINE_RUN_MAGE_VARIABLES_KEY == k:
            continue

        if (type(v) is str or
                type(v) is int or
                type(v) is bool or
                type(v) is float or
                type(v) is dict or
                type(v) is list or
                type(v) is datetime):
            variables_json[k] = v

    args = [
        '--vars',
        simplejson.dumps(
            variables_json,
            default=encode_complex,
            ignore_nan=True,
        ),
    ]

    runtime_configuration = variables.get(
        PIPELINE_RUN_MAGE_VARIABLES_KEY,
        {},
    ).get('blocks', {}).get(block.uuid, {}).get('configuration')

    if runtime_configuration:
        if runtime_configuration.get('flags'):
            flags = runtime_configuration['flags']
            flags = flags if type(flags) is list else [flags]
            # e.g. --full-refresh
            args += flags

    if BlockLanguage.SQL == block.language:
        attr = parse_attributes(block)
        project_name = attr['project_name']
        file_path = attr['file_path']
        project_full_path = attr['project_full_path']
        full_path = attr['full_path']
        path_to_model = full_path.replace(f'{project_full_path}{os.sep}', '')

        if test_execution:
            dbt_command = 'compile'

            with open(os.path.join(project_full_path, 'dbt_project.yml')) as f:
                dbt_project = yaml.safe_load(f)
                target_path = dbt_project['target-path']
                path = os.path.join(project_full_path, target_path, 'compiled', file_path)
                if os.path.exists(path):
                    os.remove(path)

        if runtime_configuration:
            prefix = runtime_configuration.get('prefix')
            if prefix:
                path_to_model = f'{prefix}{path_to_model}'

            suffix = runtime_configuration.get('suffix')
            if suffix:
                path_to_model = f'{path_to_model}{suffix}'

        args += [
            '--select',
            path_to_model,
        ]
    else:
        project_name = Template(block.configuration['dbt_project_name']).render(
            variables=variables,
            **get_template_vars(),
        )
        project_full_path = os.path.join(get_repo_path(), 'dbt', project_name)
        args += block.content.split(' ')

    profiles_dir = os.path.join(project_full_path, '.mage_temp_profiles', str(uuid.uuid4()))

    args += [
        '--project-dir',
        project_full_path,
        '--profiles-dir',
        profiles_dir,
    ]

    dbt_profile_target = (block.configuration.get('dbt_profile_target') or
                          variables.get('dbt_profile_target'))

    if dbt_profile_target:
        dbt_profile_target = Template(dbt_profile_target).render(
            variables=lambda x: variables.get(x),
            **get_template_vars(),
        )
        args += [
            '--target',
            dbt_profile_target,
        ]

    return dbt_command, args, dict(
        profile_target=dbt_profile_target,
        profiles_dir=profiles_dir,
        project_full_path=project_full_path,
    )


def create_temporary_profile(project_full_path: str, profiles_dir: str) -> Tuple[str, str]:
    profiles_full_path = os.path.join(project_full_path, PROFILES_FILE_NAME)
    profile = load_profiles_file(profiles_full_path)

    temp_profile_full_path = os.path.join(profiles_dir, PROFILES_FILE_NAME)
    os.makedirs(os.path.dirname(temp_profile_full_path), exist_ok=True)

    with open(temp_profile_full_path, 'w') as f:
        yaml.safe_dump(profile, f)

    return (profile, temp_profile_full_path)


def run_dbt_tests(
    block,
    build_block_output_stdout: Callable[..., object] = None,
    global_vars: Dict = {},
    logger: Logger = None,
    logging_tags: Dict = dict(),
) -> None:
    if logger is not None:
        stdout = StreamToLogger(logger, logging_tags=logging_tags)
    elif build_block_output_stdout:
        stdout = build_block_output_stdout(block.uuid)
    else:
        stdout = sys.stdout

    dbt_command, args, command_line_dict = build_command_line_arguments(
        block,
        global_vars,
        run_tests=True,
    )

    project_full_path = command_line_dict['project_full_path']
    profiles_dir = command_line_dict['profiles_dir']

    _, temp_profile_full_path = create_temporary_profile(
        project_full_path,
        profiles_dir,
    )

    proc1 = subprocess.run([
        'dbt',
        dbt_command,
    ] + args, preexec_fn=os.setsid, stdout=subprocess.PIPE)  # os.setsid doesn't work on Windows

    number_of_errors = 0

    with redirect_stdout(stdout):
        lines = proc1.stdout.decode().split('\n')
        for idx, line in enumerate(lines):
            print(line)

            match = re.search('ERROR=([0-9]+)', line)
            if match:
                number_of_errors += int(match.groups()[0])

    try:
        shutil.rmtree(profiles_dir)
    except Exception as err:
        print(f'Error removing temporary profile at {temp_profile_full_path}: {err}')

    if number_of_errors >= 1:
        raise Exception('DBT test failed.')


def get_dbt_project_settings(block: 'Block') -> Dict:
    attributes_dict = parse_attributes(block)
    dbt_project_full_path = attributes_dict['dbt_project_full_path']

    config = {}
    with open(dbt_project_full_path, 'r') as f:
        config = yaml.safe_load(f)

    return config


def get_model_configurations_from_dbt_project_settings(block: 'Block') -> Dict:
    dbt_project = get_dbt_project_settings(block)

    if not dbt_project.get('models'):
        return

    attributes_dict = parse_attributes(block)
    project_name = attributes_dict['project_name']
    if not dbt_project['models'].get(project_name):
        return

    models_folder_path = attributes_dict['models_folder_path']
    full_path = attributes_dict['full_path']
    parts = full_path.replace(models_folder_path, '').split(os.sep)
    parts = list(filter(lambda x: x, parts))
    if len(parts) >= 2:
        models_subfolder = parts[0]
        if dbt_project['models'][project_name].get(models_subfolder):
            return dbt_project['models'][project_name][models_subfolder]

    return dbt_project['models'][project_name]


def fetch_model_data(
    block: 'Block',
    profile_target: str,
    limit: int = None,
) -> DataFrame:
    attributes_dict = parse_attributes(block)
    model_name = attributes_dict['model_name']
    table_name = attributes_dict['table_name']

    # bigquery: dataset, schema
    # postgres: schema
    # redshift: schema
    # snowflake: schema
    # trino: schema
    profile = get_profile(block, profile_target)
    schema = profile.get('schema') or profile.get('+schema')
    if not schema and 'dataset' in profile:
        schema = profile['dataset']

    if not schema:
        raise print(
            f'WARNING: Cannot fetch data from model {model_name}, ' +
            f'no schema found in profile target {profile_target}.',
        )

    # Check dbt_profiles for schema to append

    # If the model SQL file contains a config with schema, change the schema to use that.
    # https://docs.getdbt.com/reference/resource-configs/schema
    config = model_config(block.content)
    config_schema = config.get('schema')
    if config_schema:
        schema = f'{schema}_{config_schema}'
    else:
        # settings from the dbt_project.yml
        model_configurations = get_model_configurations_from_dbt_project_settings(block)
        model_configuration_schema = None
        if model_configurations:
            model_configuration_schema = (model_configurations.get('schema') or
                                          model_configurations.get('+schema'))

        if model_configuration_schema:
            schema = f"{schema}_{model_configuration_schema}"

    query_string = f'SELECT * FROM {schema}.{table_name}'

    return execute_query(block, profile_target, query_string, limit)


def upstream_blocks_from_sources(block: Block) -> List[Block]:
    mapping = {}
    sources = extract_sources(block.content)
    for tup in sources:
        source_name, table_name = tup
        if source_name not in mapping:
            mapping[source_name] = {}
        mapping[source_name][table_name] = True

    attributes_dict = parse_attributes(block)
    source_name = attributes_dict['source_name']

    arr = []
    for b in block.upstream_blocks:
        table_name = source_table_name_for_block(b)
        if mapping.get(source_name, {}).get(table_name):
            arr.append(b)

    return arr


def model_config(text: str) -> Dict:
    """
    Extract the run time configuration for the model.
    https://docs.getdbt.com/docs/build/custom-aliases
    e.g. {{ config(...) }}
    """
    matches = re.findall(r"""{{\s+config\(([^)]+)\)\s+}}""", text)

    config = {}
    for key_values_string in matches:
        key_values = key_values_string.strip().split(',')
        for key_value_string in key_values:
            parts = key_value_string.strip().split('=')
            if len(parts) == 2:
                key, value = parts
                key = key.strip()
                value = value.strip()
                if value:
                    if ((value[0] == "'" and value[-1] == "'") or
                            (value[0] == '"' and value[-1] == '"')):
                        value = value[1:-1]
                config[key] = value

    return config
