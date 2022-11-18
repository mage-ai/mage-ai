from contextlib import redirect_stdout
from jinja2 import Template
from logging import Logger
from mage_ai.data_preparation.models.block.sql import (
    bigquery,
    execute_sql_code as execute_sql_code_orig,
    postgres,
    snowflake,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.io.base import DataSource, ExportWritePolicy
from mage_ai.io.config import ConfigFileLoader
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex
from mage_ai.shared.utils import files_in_path
from pandas import DataFrame
from typing import Callable, Dict, List, Tuple
import os
import re
import simplejson
import subprocess
import sys
import yaml


def parse_attributes(block) -> Dict:
    file_path = block.configuration['file_path']
    project_name = file_path.split('/')[0]
    filename = file_path.split('/')[-1]
    model_name = None
    file_extension = None

    parts = filename.split('.')
    if len(parts) >= 2:
        model_name = '.'.join(parts[:-1])
        file_extension = parts[-1]

    project_full_path = f'{get_repo_path()}/dbt/{project_name}'

    full_path = f'{get_repo_path()}/dbt/{file_path}'
    sources_full_path = re.sub(filename, 'mage_sources.yml', full_path)

    source_name = f'mage_{project_name}'

    return dict(
        file_extension=file_extension,
        file_path=file_path,
        filename=filename,
        full_path=full_path,
        model_name=model_name,
        profiles_full_path=f'{project_full_path}/profiles.yml',
        project_full_path=project_full_path,
        project_name=project_name,
        source_name=source_name,
        sources_full_path=sources_full_path,
    )


def extract_refs(block) -> List[str]:
    return re.findall(
        "{}[ ]*ref\(['\"]+([\w]+)['\"]+\)[ ]*{}".format('\{\{', '\}\}'),
        block.content,
    )


def add_blocks_upstream_from_refs(block) -> None:
    attributes_dict = parse_attributes(block)
    project_name = attributes_dict['project_name']
    models_folder_path = f'{get_repo_path()}/dbt/{project_name}/models'

    files_by_name = {}
    for file_path_orig in files_in_path(models_folder_path):
        file_path = re.sub(f'{models_folder_path}/', '', file_path_orig)
        filename = file_path.split('/')[-1]
        parts = filename.split('.')
        if len(parts) >= 2:
            fn = '.'.join(parts[:-1])
            file_extension = parts[-1]
            if 'sql' == file_extension:
                files_by_name[fn] = file_path_orig

    added_blocks = []
    for idx, ref in enumerate(extract_refs(block)):
        uuid = re.sub(f'{get_repo_path()}/dbt/', '', files_by_name[ref])

        new_block = block.__class__.create(
            uuid,
            block.type,
            get_repo_path(),
            configuration=dict(
                file_path=uuid,
            ),
            language=block.language,
            pipeline=block.pipeline,
        )
        added_blocks.append(new_block)

    return added_blocks


def get_source(block) -> Dict:
    attributes_dict = parse_attributes(block)
    source_name = attributes_dict['source_name']
    settings = load_sources(block)
    return find(lambda x: x['name'] == source_name, settings.get('sources', []))


def load_sources(block) -> Dict:
    attributes_dict = parse_attributes(block)
    sources_full_path = attributes_dict['sources_full_path']
    if os.path.exists(sources_full_path):
        with open(sources_full_path, 'r') as f:
            return yaml.safe_load(f) or dict(sources=[], version=2)


def source_table_name_for_block(block) -> str:
    return f'{block.pipeline.uuid}_{block.uuid}'


def update_model_settings(block, upstream_blocks, upstream_blocks_previous):
    attributes_dict = parse_attributes(block)

    filename = attributes_dict['filename']
    full_path = attributes_dict['full_path']
    project_name = attributes_dict['project_name']
    sources_full_path = attributes_dict['sources_full_path']
    source_name = attributes_dict['source_name']

    if len(upstream_blocks_previous) > len(upstream_blocks):
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

            new_table = dict(name=table_name)
            new_source = dict(
                name=source_name,
                tables=[
                    new_table,
                ],
            )

            settings = load_sources(block)
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

            with open(sources_full_path, 'w') as f:
                yaml.safe_dump(settings, f)


def get_profile(block, profile_target: str = None) -> Dict:
    attr = parse_attributes(block)
    project_name = attr['project_name']
    profiles_full_path = attr['profiles_full_path']

    with open(profiles_full_path, 'r') as f:
        try:
            text = Template(f.read()).render(
                env_var=os.getenv,
            )
            profile = yaml.safe_load(text)[project_name]
            outputs = profile['outputs']
            target = profile.get('target')

            return outputs.get(profile_target or target)
        except Exception:
            print(f'Error loading file {profiles_full_path}, please check file content syntax.')


def config_file_loader_and_configuration(block, profile_target: str) -> Dict:
    profile = get_profile(block, profile_target)

    if not profile:
        raise Exception(f'No profile target named {profile_target}, check the profiles.yml file.')
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
    elif DataSource.SNOWFLAKE == profile_type:
        database = profile.get('database')
        schema = profile.get('schema')
        config_file_loader = ConfigFileLoader(config=dict(
            SNOWFLAKE_USER=profile.get('user'),
            SNOWFLAKE_PASSWORD=profile.get('password'),
            SNOWFLAKE_ACCOUNT=profile.get('account'),
            SNOWFLAKE_DEFAULT_WH=profile.get('warehouse'),
            SNOWFLAKE_DEFAULT_DB=profile.get('database'),
            SNOWFLAKE_DEFAULT_SCHEMA=profile.get('schema'),
        ))
        configuration = dict(
            data_provider=profile_type,
            data_provider_database=database,
            data_provider_schema=schema,
            export_write_policy=ExportWritePolicy.REPLACE,
        )

    if not config_file_loader or not configuration:
        attr = parse_attributes(block)
        profiles_full_path = attr['profiles_full_path']

        msg = f'No configuration matching profile type {profile_type}. ' \
            f'Change your target in {profiles_full_path} ' \
            'or add dbt_profile_target to your global variables.'
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

    if DataSource.POSTGRES == data_provider:
        from mage_ai.io.postgres import Postgres

        with Postgres.with_config(config_file_loader) as loader:
            postgres.create_upstream_block_tables(
                loader,
                block,
                cascade_on_drop=True,
                configuration=configuration,
                cache_upstream_dbt_models=cache_upstream_dbt_models,
                **kwargs,
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
    elif DataSource.SNOWFLAKE == data_provider:
        from mage_ai.io.snowflake import Snowflake

        with Snowflake.with_config(config_file_loader) as loader:
            snowflake.create_upstream_block_tables(
                loader,
                block,
                configuration=configuration,
                cache_upstream_dbt_models=cache_upstream_dbt_models,
                **kwargs,
            )


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

        return f'{__quoted(schema)}.{__quoted(tn)}'

    for idx, upstream_block in enumerate(block.upstream_blocks):
        if BlockType.DBT != upstream_block.type:
            continue

        attrs = parse_attributes(upstream_block)
        model_name = attrs['model_name']
        matcher1 = f'{__quoted(profile_database)}.{__quoted(profile_schema)}.'\
                   f'{__quoted(model_name)}'

        database = configuration.get('data_provider_database')
        schema = configuration.get('data_provider_schema')
        table_name = upstream_block.table_name

        query = re.sub(
            matcher1,
            __replace_func(database, schema, table_name),
            query,
        )

    return query


def query_from_compiled_sql(block, profile_target: str) -> DataFrame:
    attr = parse_attributes(block)

    config_file_loader, configuration = config_file_loader_and_configuration(
        block,
        profile_target,
    )
    data_provider = configuration['data_provider']

    project_full_path = attr['project_full_path']
    file_path = attr['file_path']

    profile = get_profile(block, profile_target)

    with open(f'{project_full_path}/target/compiled/{file_path}', 'r') as f:
        query_string = f.read()

        profile_type = profile.get('type')
        quote_str = ''
        if DataSource.POSTGRES == profile_type:
            database = profile['dbname']
            schema = profile['schema']
            quote_str = '"'
        elif DataSource.BIGQUERY == profile_type:
            database = profile['project']
            schema = profile['dataset']
            quote_str = '`'
        elif DataSource.SNOWFLAKE == profile_type:
            database = profile['database']
            schema = profile['schema']

        query_string = interpolate_input(
            block,
            query_string,
            configuration=configuration,
            profile_database=database,
            profile_schema=schema,
            quote_str=quote_str,
        )

        if DataSource.POSTGRES == data_provider:
            from mage_ai.io.postgres import Postgres

            with Postgres.with_config(config_file_loader) as loader:
                return loader.load(query_string)
        elif DataSource.BIGQUERY == data_provider:
            from mage_ai.io.bigquery import BigQuery

            loader = BigQuery.with_config(config_file_loader)
            return loader.load(query_string)
        elif DataSource.SNOWFLAKE == data_provider:
            from mage_ai.io.snowflake import Snowflake

            with Snowflake.with_config(config_file_loader) as loader:
                return loader.load(query_string)


def build_command_line_arguments(
    block,
    variables: Dict,
    run_tests: bool = False,
    test_execution: bool = False,
) -> Tuple[str, List[str], Dict]:
    variables = merge_dict(
        variables,
        get_global_variables(block.pipeline.uuid) if block.pipeline else {},
    )
    dbt_command = 'test' if run_tests else 'run'

    args = [
        '--vars',
        simplejson.dumps(
            variables,
            default=encode_complex,
            ignore_nan=True,
        ),
    ]

    if BlockLanguage.SQL == block.language:
        attr = parse_attributes(block)
        project_name = attr['project_name']
        file_path = attr['file_path']
        project_full_path = attr['project_full_path']
        full_path = attr['full_path']
        path_to_model = re.sub(f'{project_full_path}/', '', full_path)

        if test_execution:
            dbt_command = 'compile'

            with open(f'{project_full_path}/dbt_project.yml') as f:
                dbt_project = yaml.safe_load(f)
                target_path = dbt_project['target-path']
                path = f'{project_full_path}/{target_path}/compiled/{file_path}'
                if os.path.exists(path):
                    os.remove(path)

        args += [
            '--select',
            path_to_model,
        ]
    else:
        project_name = Template(block.configuration['dbt_project_name']).render(
            env_var=os.getenv,
            variables=variables,
        )
        project_full_path = f'{get_repo_path()}/dbt/{project_name}'
        args += block.content.split(' ')

    args += [
        '--project-dir',
        project_full_path,
        '--profiles-dir',
        project_full_path,
    ]

    dbt_profile_target = block.configuration.get('dbt_profile_target') \
        or variables.get('dbt_profile_target')

    if dbt_profile_target:
        dbt_profile_target = Template(dbt_profile_target).render(
            env_var=os.getenv,
            variables=lambda x: variables.get(x),
        )
        args += [
            '--target',
            dbt_profile_target,
        ]

    return dbt_command, args, dict(
        profile_target=dbt_profile_target,
        project_full_path=project_full_path,
    )


def run_dbt_tests(
    block,
    build_block_output_stdout: Callable[..., object] = None,
    global_vars: Dict = {},
    logger: Logger = None,
) -> None:
    if logger is not None:
        stdout = StreamToLogger(logger)
    elif build_block_output_stdout:
        stdout = build_block_output_stdout(block.uuid)
    else:
        stdout = sys.stdout

    dbt_command, args, _ = build_command_line_arguments(block, global_vars, run_tests=True)

    proc1 = subprocess.run([
        'dbt',
        dbt_command,
    ] + args, preexec_fn=os.setsid, stdout=subprocess.PIPE)

    number_of_errors = 0

    with redirect_stdout(stdout):
        lines = proc1.stdout.decode().split('\n')
        for idx, line in enumerate(lines):
            print(line)

            match = re.search('ERROR=([0-9]+)', line)
            if match:
                number_of_errors += int(match.groups()[0])

    if number_of_errors >= 1:
        raise Exception('DBT test failed.')
