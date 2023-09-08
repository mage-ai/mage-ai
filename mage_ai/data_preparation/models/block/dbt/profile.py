import os
import re
from typing import Dict, Tuple

import aiofiles
import yaml
from jinja2 import Template

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.io.base import DataSource, ExportWritePolicy
from mage_ai.io.config import ConfigFileLoader
from mage_ai.settings.repo import get_repo_path

PROFILES_FILE_NAME = 'profiles.yml'


class DBTProfileHandler:

    @classmethod
    def create_temporary_profile(
        cls,
        project_full_path: str,
        profiles_dir: str,
        variables: Dict = None,
    ) -> Tuple[str, str]:
        profiles_full_path = os.path.join(project_full_path, PROFILES_FILE_NAME)
        profile = cls.__load_profiles_file(profiles_full_path, variables)

        temp_profile_full_path = os.path.join(profiles_dir, PROFILES_FILE_NAME)
        os.makedirs(os.path.dirname(temp_profile_full_path), exist_ok=True)

        with open(temp_profile_full_path, 'w') as f:
            yaml.safe_dump(profile, f)

        return (profile, temp_profile_full_path)

    @classmethod
    def load_profile(
        cls,
        profile_name: str,
        profiles_full_path: str,
        profile_target: str = None,
        variables: Dict = None,
    ) -> Dict:
        profile = cls.__load_profiles(profile_name, profiles_full_path, variables)
        outputs = profile.get('outputs', {})
        target = profile.get('target', None)

        return outputs.get(profile_target or target)

    @classmethod
    async def load_profiles_async(
        cls,
        profile_name: str,
        profiles_full_path: str,
        variables: Dict = None,
    ) -> Dict:
        profiles = await cls.__load_profiles_file_async(profiles_full_path, variables=variables)

        if not profiles or profile_name not in profiles:
            print(
                f'Project name {profile_name} does not exist'+
                f'in profile file {profiles_full_path}.'
            )
            return {}

        return profiles[profile_name]

    @classmethod
    def config_file_loader_and_configuration(
        cls,
        block,
        profile_target: str,
        variables: Dict = None,
        **kwargs,
    ) -> Dict:
        profile = cls.get_profile(block, profile_target, variables)

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
            database = kwargs.get('database') or profile.get('project')
            schema = profile.get('dataset')

            config_file_loader_kwargs = dict(
                GOOGLE_SERVICE_ACC_KEY_FILEPATH=keyfile,
            )
            if profile.get('location'):
                config_file_loader_kwargs['GOOGLE_LOCATION'] = profile.get('location')
            config_file_loader = ConfigFileLoader(config=config_file_loader_kwargs)
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
                SNOWFLAKE_DEFAULT_DB=database,
                SNOWFLAKE_DEFAULT_SCHEMA=schema,
                SNOWFLAKE_DEFAULT_WH=profile.get('warehouse'),
                SNOWFLAKE_USER=profile.get('user'),
                SNOWFLAKE_ROLE=profile.get('role'),
            )

            if profile.get('password', None):
                config['SNOWFLAKE_PASSWORD'] = profile['password']
            if profile.get('private_key_passphrase', None):
                config['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = profile['private_key_passphrase']
            if profile.get('private_key_path', None):
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
        elif DataSource.CLICKHOUSE == profile_type:
            database = profile.get('schema')
            interface = profile.get('driver')

            config_file_loader = ConfigFileLoader(config=dict(
                CLICKHOUSE_DATABASE=database,
                CLICKHOUSE_HOST=profile.get('host'),
                CLICKHOUSE_INTERFACE=interface,
                CLICKHOUSE_PASSWORD=profile.get('password'),
                CLICKHOUSE_PORT=profile.get('port'),
                CLICKHOUSE_USERNAME=profile.get('user'),
            ))
            configuration = dict(
                data_provider=profile_type,
                data_provider_database=database,
                export_write_policy=ExportWritePolicy.REPLACE,
            )

        if not config_file_loader or not configuration:
            attr = cls.parse_attributes(block, variables=variables)
            profiles_full_path = attr['profiles_full_path']

            msg = (
                f'No configuration matching profile type {profile_type}. '
                f'Change your target in {profiles_full_path} '
                'or add dbt_profile_target to your global variables.'
            )
            raise Exception(msg)

        return config_file_loader, configuration

    @classmethod
    def get_profile(cls, block, profile_target: str = None, variables: Dict = None) -> Dict:
        attr = cls.parse_attributes(block, variables=variables)
        profile_name = attr['profile_name']
        profiles_full_path = attr['profiles_full_path']

        return cls.load_profile(profile_name, profiles_full_path, profile_target, variables=variables)

    @classmethod
    def __load_profiles_file(cls, profiles_full_path: str, variables: Dict = None) -> Dict:
        try:
            with open(profiles_full_path, 'r') as f:
                try:
                    text = Template(f.read()).render(
                        variables=lambda x: variables.get(x) if variables else None,
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

    @classmethod
    async def __load_profiles_file_async(cls, profiles_full_path: str, variables: Dict = None) -> Dict:
        try:
            async with aiofiles.open(profiles_full_path, mode='r') as fp:
                try:
                    file_content = await fp.read()
                    text = Template(file_content).render(
                        variables=lambda x: variables.get(x) if variables else None,
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

    @classmethod
    def __load_profiles(cls, profile_name: str, profiles_full_path: str, variables: Dict = None) -> Dict:
        profiles = cls.__load_profiles_file(profiles_full_path, variables=variables)

        if not profiles or profile_name not in profiles:
            print(f'Project name {profile_name} does not exist in profile file {profiles_full_path}.')
            return {}

        return profiles[profile_name]

    @classmethod
    def parse_attributes(cls, block, variables: Dict = None) -> Dict:
        configuration = block.configuration

        file_path = configuration['file_path']
        path_parts = file_path.split(os.sep)
        project_folder_name = path_parts[0]
        filename = path_parts[-1]

        first_folder_name = None
        if len(path_parts) >= 3:
            # e.g. demo_project/models/users.sql will be
            # ['demo_project', 'models', 'users.sql']
            first_folder_name = path_parts[1]

        model_name = None
        file_extension = None

        parts = filename.split('.')
        if len(parts) >= 2:
            model_name = '.'.join(parts[:-1])
            file_extension = parts[-1]

        # Check the model SQL file content for a config with an alias value. If it exists,
        # use that alias value as the table name instead of the model’s name.
        table_name = model_name
        config = cls.model_config(block.content)
        if config.get('alias'):
            table_name = config['alias']
        database = config.get('database', None)

        full_path = os.path.join(get_repo_path(), 'dbt', file_path)

        project_full_path = os.path.join(get_repo_path(), 'dbt', project_folder_name)
        dbt_project_full_path = os.path.join(project_full_path, 'dbt_project.yml')

        dbt_project = None
        project_name = project_folder_name
        profile_name = project_folder_name
        with open(dbt_project_full_path, 'r') as f:
            dbt_project = yaml.safe_load(f)
            project_name = dbt_project.get('name') or project_folder_name
            profile_name = dbt_project.get('profile') or project_name

        models_folder_path = os.path.join(project_full_path, 'models')
        sources_full_path = os.path.join(models_folder_path, 'mage_sources.yml')
        sources_full_path_legacy = full_path.replace(filename, 'mage_sources.yml')

        profiles_full_path = os.path.join(project_full_path, PROFILES_FILE_NAME)
        profile_target = configuration.get('dbt_profile_target')
        profile = DBTProfileHandler.load_profile(profile_name, profiles_full_path, profile_target, variables)

        source_name = f'mage_{project_name}'
        if profile:
            if (DataSource.MYSQL == profile.get('type') or
                    DataSource.REDSHIFT == profile.get('type') or
                    DataSource.TRINO == profile.get('type') or
                    DataSource.MSSQL == profile.get('type') or
                    DataSource.SPARK == profile.get('type')):
                source_name = profile['schema']

        file_path_with_project_name = os.path.join(project_name, *path_parts[1:])

        snapshot_paths = dbt_project.get('snapshot-paths', [])
        snapshot = first_folder_name and first_folder_name in snapshot_paths

        return dict(
            database=database,
            dbt_project=dbt_project,
            dbt_project_full_path=dbt_project_full_path,
            file_extension=file_extension,
            file_path=file_path,
            file_path_with_project_name=file_path_with_project_name,
            filename=filename,
            first_folder_name=first_folder_name,
            full_path=full_path,
            model_name=model_name,
            models_folder_path=models_folder_path,
            profile=profile,
            profile_name=profile_name,
            profiles_full_path=profiles_full_path,
            project_folder_name=project_folder_name,
            project_full_path=project_full_path,
            project_name=project_name,
            snapshot=snapshot,
            source_name=source_name,
            sources_full_path=sources_full_path,
            sources_full_path_legacy=sources_full_path_legacy,
            table_name=table_name,
            target_path=dbt_project.get('target-path', 'target'),
        )

    @classmethod
    def model_config(cls, text: str) -> Dict:
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

    @classmethod
    def get_model_configurations_from_dbt_project_settings(
        cls,
        block: 'Block',
        variables: Dict = None,
    ) -> Dict:
        attributes_dict = cls.parse_attributes(block, variables=variables)
        dbt_project = attributes_dict['dbt_project']

        if not dbt_project.get('models'):
            return

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

    @classmethod
    def get_dbt_project_name_from_settings(cls, project_folder_name: str) -> Dict:
        project_full_path = os.path.join(get_repo_path(), 'dbt', project_folder_name)
        dbt_project_full_path = os.path.join(project_full_path, 'dbt_project.yml')

        dbt_project = None
        project_name = project_folder_name
        profile_name = project_folder_name

        if os.path.isfile(dbt_project_full_path):
            with open(dbt_project_full_path, 'r') as f:
                dbt_project = yaml.safe_load(f)
                project_name = dbt_project.get('name') or project_folder_name
                profile_name = dbt_project.get('profile') or project_name

        return dict(
            profile_name=profile_name,
            project_name=project_name,
        )
