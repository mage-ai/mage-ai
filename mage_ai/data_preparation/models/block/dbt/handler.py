import os
import re
import shutil
import subprocess
import sys
import uuid
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime
from logging import Logger
from typing import Callable, Dict, List, Tuple

import simplejson
from jinja2 import Template
from pandas import DataFrame

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.profile import DBTProfileHandler
from mage_ai.data_preparation.models.block.sql import (
    execute_sql_code as execute_sql_code_orig,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.io.base import DataSource
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex


class DBTHandler:
    @classmethod
    def execute_sql_code(
        cls,
        block,
        query: str,
        profile_target: str,
        variables: Dict = None,
        **kwargs,
    ):
        config_file_loader, configuration = DBTProfileHandler.config_file_loader_and_configuration(
            block,
            profile_target,
            variables=variables,
        )

        return execute_sql_code_orig(
            block,
            query,
            config_file_loader=config_file_loader,
            configuration=configuration,
            **kwargs,
        )

    @classmethod
    def interpolate_input(
        cls,
        block,
        query: str,
        configuration: Dict,
        profile_database: str,
        profile_schema: str,
        quote_str: str = '',
        replace_func=None,
        variables: Dict = None,
    ) -> str:
        def __quoted(name):
            return quote_str + name + quote_str

        def __replace_func(db, schema, tn):
            if replace_func:
                return replace_func(db, schema, tn)

            if db and not schema:
                return f'{__quoted(db)}.{__quoted(tn)}'

            return f'{__quoted(schema)}.{__quoted(tn)}'

        for _, upstream_block in enumerate(block.upstream_blocks):
            if BlockType.DBT != upstream_block.type:
                continue

            attrs = DBTProfileHandler.parse_attributes(upstream_block, variables=variables)
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

    @classmethod
    def interpolate_refs_with_table_names(
        cls,
        query_string: str,
        block: Block,
        profile_target: str,
        configuration: Dict,
        variables: Dict = None,
    ):
        profile = DBTProfileHandler.get_profile(block, profile_target, variables)

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

        return cls.interpolate_input(
            block,
            query_string,
            configuration=configuration,
            profile_database=database,
            profile_schema=schema,
            quote_str=quote_str,
            variables=variables,
        )

    @classmethod
    def compiled_query_string(
        cls,
        block: Block,
        error_if_not_found: bool = False,
        variables: Dict = None,
    ) -> str:
        attr = DBTProfileHandler.parse_attributes(block, variables=variables)

        file_path_with_project_name = attr['file_path_with_project_name']
        project_full_path = attr['project_full_path']
        target_path = attr['target_path']
        snapshot = attr['snapshot']

        folder_name = 'run' if snapshot else 'compiled'
        file_path = os.path.join(
            project_full_path,
            target_path,
            folder_name,
            file_path_with_project_name,
        )

        if not os.path.exists(file_path):
            if error_if_not_found:
                raise Exception(f'Compiled SQL query file at {file_path} not found.')
            return None

        with open(file_path, 'r') as f:
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

    @classmethod
    def execute_query(
        cls,
        block,
        profile_target: str,
        query_string: str,
        limit: int = None,
        database: str = None,
        variables: Dict = None,
    ) -> DataFrame:
        config_file_loader, configuration = DBTProfileHandler.config_file_loader_and_configuration(
            block,
            profile_target,
            database=database,
            variables=variables,
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
        elif DataSource.CLICKHOUSE == data_provider:
            from mage_ai.io.clickhouse import ClickHouse

            loader = ClickHouse.with_config(config_file_loader)
            return loader.load(query_string, **shared_kwargs)

    @classmethod
    def query_from_compiled_sql(
        cls,
        block,
        profile_target: str,
        limit: int = None,
        variables: Dict = None,
    ) -> DataFrame:
        query_string = cls.compiled_query_string(block, error_if_not_found=True, variables=variables)

        return cls.execute_query(block, profile_target, query_string, limit, variables=variables)

    @classmethod
    def build_command_line_arguments(
        cls,
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
        dbt_command = (block.configuration or {}).get('dbt', {}).get('command', 'run')

        if run_tests:
            dbt_command = 'test'

        if run_settings:
            if run_settings.get('build_model'):
                dbt_command = 'build'
            elif run_settings.get('test_model'):
                dbt_command = 'test'

        args = []

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
            attr = DBTProfileHandler.parse_attributes(block, variables=variables)

            file_path = attr['file_path']
            full_path = attr['full_path']
            project_full_path = attr['project_full_path']
            project_name = attr['project_name']
            snapshot = attr['snapshot']
            target_path = attr['target_path']

            path_to_model = full_path.replace(f'{project_full_path}{os.sep}', '')

            if snapshot:
                dbt_command = 'snapshot'
            elif test_execution:
                dbt_command = 'compile'

                # Remove previously compiled SQL so that the upcoming compile command creates a fresh
                # compiled SQL file.
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
            content_args = block.content.split(' ')
            try:
                vars_start_idx = content_args.index('--vars')
                vars_parts = []
                vars_end_idx = vars_start_idx + 2
                # Include variables if they have spaces in the object
                for i in range(vars_start_idx, len(content_args)):
                    current_item = content_args[i]
                    if i > vars_start_idx and current_item.startswith('--'):
                        """
                        Stop including parts of the variables object (e.g. {"key": "value"}
                        is split into ['{"key":', '"value"}']. The variables object can have
                        many parts.) when next command line arg is reached. If there is not a
                        next command line argument (such as "--exclude"), then the remaining
                        items should belong to the variables object.
                        """
                        vars_end_idx = i
                        break
                    elif current_item != ('--vars'):
                        vars_parts.append(content_args[i])
                        vars_end_idx = i + 1

                vars_str = ''.join(vars_parts)
                interpolated_vars = re.findall(r'\{\{(.*?)\}\}', vars_str)
                for v in interpolated_vars:
                    val = variables.get(v.strip())
                    variable_with_brackets = '{{' + v + '}}'
                    """
                    Replace the variables in the command with the JSON-supported values
                    from the global/environment variables.
                    """
                    if val is not None:
                        vars_str = vars_str.replace(variable_with_brackets, simplejson.dumps(val))
                    else:
                        vars_str = vars_str.replace(
                            variable_with_brackets,
                            simplejson.dumps(variable_with_brackets),
                        )

                # Remove trailing single quotes to form proper json
                if vars_str.startswith("'") and vars_str.endswith("'"):
                    vars_str = vars_str[1:-1]
                # Variables object needs to be formatted as JSON
                vars_dict = simplejson.loads(vars_str)
                variables = merge_dict(variables, vars_dict)
                del content_args[vars_start_idx:vars_end_idx]
            except ValueError:
                # If args do not contain "--vars", continue.
                pass

            # Add non-empty content args
            args += [c for c in content_args if c]

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

        args += [
            '--vars',
            simplejson.dumps(
                variables_json,
                default=encode_complex,
                ignore_nan=True,
            ),
        ]

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

    @classmethod
    def run_dbt_tests(
        cls,
        block,
        build_block_output_stdout: Callable[..., object] = None,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
    ) -> None:
        if global_vars is None:
            global_vars = {}
        if logging_tags is None:
            logging_tags = {}

        if block.configuration.get('file_path') is not None:
            attributes_dict = DBTProfileHandler.parse_attributes(block, variables=global_vars)
            snapshot = attributes_dict['snapshot']
            if snapshot:
                return

        if logger is not None:
            stdout = StreamToLogger(logger, logging_tags=logging_tags)
        elif build_block_output_stdout:
            stdout = build_block_output_stdout(block.uuid)
        else:
            stdout = sys.stdout

        dbt_command, args, command_line_dict = cls.build_command_line_arguments(
            block,
            global_vars,
            run_tests=True,
        )

        project_full_path = command_line_dict['project_full_path']
        profiles_dir = command_line_dict['profiles_dir']

        _, temp_profile_full_path = DBTProfileHandler.create_temporary_profile(
            project_full_path,
            profiles_dir,
            variables=global_vars,
        )

        proc1 = subprocess.run([
            'dbt',
            dbt_command,
        ] + args, preexec_fn=os.setsid, stdout=subprocess.PIPE)  # os.setsid doesn't work on Windows

        number_of_errors = 0

        with redirect_stdout(stdout), redirect_stderr(stdout):
            lines = proc1.stdout.decode().split('\n')
            for _, line in enumerate(lines):
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

    @classmethod
    def fetch_model_data(
        cls,
        block: 'Block',
        profile_target: str,
        limit: int = None,
        variables: Dict = None,
    ) -> DataFrame:
        attributes_dict = DBTProfileHandler.parse_attributes(block, variables=variables)
        model_name = attributes_dict['model_name']
        table_name = attributes_dict['table_name']

        # bigquery: dataset, schema
        # postgres: schema
        # redshift: schema
        # snowflake: schema
        # trino: schema
        profile = DBTProfileHandler.get_profile(block, profile_target, variables=variables)
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
        config = DBTProfileHandler.model_config(block.content)
        config_database = config.get('database')
        config_schema = config.get('schema')

        # settings from the dbt_project.yml
        model_configurations = DBTProfileHandler.get_model_configurations_from_dbt_project_settings(
            block,
            variables=variables,
        )

        if config_schema:
            schema = f'{schema}_{config_schema}'
        else:
            model_configuration_schema = None
            if model_configurations:
                model_configuration_schema = (model_configurations.get('schema') or
                                            model_configurations.get('+schema'))

            if model_configuration_schema:
                schema = f"{schema}_{model_configuration_schema}"

        database = None
        if config_database:
            database = config_database
        elif model_configurations:
            database = (model_configurations.get('database') or
                        model_configurations.get('+database'))

        query_string = f'SELECT * FROM {schema}.{table_name}'

        return cls.execute_query(
            block,
            profile_target,
            query_string,
            limit,
            database=database,
            variables=variables,
        )
