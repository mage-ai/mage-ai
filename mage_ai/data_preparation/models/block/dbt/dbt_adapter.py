import os
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple, Union

import dbt.flags as flags
import pandas as pd
from dbt.adapters.base import BaseRelation, Credentials
from dbt.adapters.factory import (
    Adapter,
    cleanup_connections,
    get_adapter,
    register_adapter,
    reset_adapters,
)
from dbt.config.profile import read_user_config
from dbt.config.runtime import RuntimeConfig
from dbt.contracts.connection import AdapterResponse
from dbt.contracts.relation import RelationType

from mage_ai.data_preparation.models.block.dbt.profiles import Profiles
from mage_ai.shared.environments import is_debug


@dataclass
class DBTAdapterConfig:
    """
    Minimal config needed in order to setup dbt adapter
    """
    project_dir: Union[str, os.PathLike]
    profiles_dir: Union[str, os.PathLike]
    profile: Optional[str] = None
    target: Optional[str] = None
    threads = None


class DBTAdapter:
    def __init__(
        self,
        project_path: Union[str, os.PathLike],
        variables: Optional[Dict[str, Any]] = None,
        target: Optional[str] = None
    ):
        """
        Set up dbt adapter. This allows to use any dbt based connections.

        Args:
            project_path (Union[str, os.PathLike]):
                Project, which should be used for setting up the dbt adapter
            variables (Optional[Dict[str, Any]], optional):
                Variables for interpolating the profiles.yml. Defaults to None.
            target (Optional[str], optional):
                Whether to use a target other than the one configured in profiles.yml.
                Defaults to None.
        """
        self.project_path: Union[str, os.PathLike] = project_path
        self.variables: Optional[Dict[str, Any]] = variables
        self.target: Optional[str] = target

        self.__adapter: Optional[Adapter] = None
        self.__profiles: Optional[Profiles] = None

    @property
    def credentials(self) -> Credentials:
        """
        The credentials object, which has all database credentials.

        Returns:
            Credentials: Database credentials of the adapter
        """
        return self.__adapter.connections.profile.credentials

    def close(self) -> None:
        """
        Close connection, which was opened by the adapter
        """
        self.__adapter.release_connection()
        cleanup_connections()
        # remove interpolated profiles.yml
        self.__profiles.clean()

    def execute(self, sql: str, fetch: bool = False) -> Tuple[AdapterResponse, pd.DataFrame]:
        """
        Executes any sql statement using the dbt adapter.

        Args:
            sql (str): The sql statement to execute.
            fetch (bool, optional):
                Whether to fetch results from the sql statement. Defaults to False.

        Returns:
            Tuple[AdapterResponse, pd.DataFrame]: Adapter Response and the result dataframe.
        """
        res, table = self.__adapter.execute(sql, fetch=fetch)
        df = pd.DataFrame(
            table.rows,
            table.column_names
        )
        return res, df

    def execute_macro(
        self,
        macro_name: str,
        package: Optional[str] = None,
        context_overide: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Optional[Any]:
        """
        Executes any dbt macro by name.

        Args:
            macro_name (str): Name of the macro
            package (Optional[str], optional):
                Name of the package of the macro.
                Defaults to None, which uses the project macros-path only.
            context_overide (Optional[Dict[str, Any]], optional):
                Additional context for the macro execution. E.g. can be used to inject functions
                or variables like the common dbt `this`. Defaults to None.

        Returns:
            Optional[Any]: Macro result
        """
        # begin transaction
        self.__adapter.connections.begin()

        from dbt.parser.manifest import ManifestLoader
        manifest = ManifestLoader.load_macros(
            self.__adapter.config,
            self.__adapter.connections.set_query_header,
            base_macros_only=False,
        )
        macro = manifest.find_macro_by_name(
            macro_name,
            self.__adapter.config.project_name,
            package
        )

        # create a context for the macro (e.g. downstream macros)
        from dbt.context.providers import generate_runtime_macro_context
        macro_context = generate_runtime_macro_context(
            macro=macro,
            config=self.__adapter.config,
            manifest=manifest,
            package_name=package,
        )

        # e.g. injecting relation
        if context_overide:
            macro_context.update(context_overide)

        # get the final macro function
        from dbt.clients.jinja import MacroGenerator
        macro_function = MacroGenerator(macro, macro_context)

        with self.__adapter.connections.exception_handler(f"macro {macro_name}"):
            result = macro_function(**kwargs)
            # commit transaction
            self.__adapter.connections.commit()
        return result

    def get_relation(
        self,
        database: Optional[str] = None,
        schema: Optional[str] = None,
        identifier: Optional[str] = None,
        type: Optional[RelationType] = RelationType.Table
    ) -> BaseRelation:
        """
        Gets a relation, which can be used in conjunction with dbt macros.

        Args:
            database (Optional[str], optional):
                The database to use. Defaults to None.
            schema (Optional[str], optional):
                The schema to use. Defaults to None.
            identifier (Optional[str], optional):
                The identifier to use. Defaults to None.
            type (Optional[RelationType], optional):
                Of which type the relation is (e.g. table/view). Defaults to RelationType.Table.

        Returns:
            BaseRelation: initialized dbt Relation
        """
        return self.__adapter.Relation.create(
            database=database,
            schema=schema,
            identifier=identifier,
            quote_policy=self.__adapter.Relation.get_default_quote_policy().to_dict(omit_none=True),
            type=type
        )

    def open(self) -> 'DBTAdapter':
        """
        Opens the connection to database configured by dbt

        Returns:
            DBTAdapter: DBTAdapter with opened connection
        """
        # create interpolated profiles.yml
        self.__profiles = Profiles(self.project_path, self.variables)
        profiles_path = self.__profiles.interpolate()

        # set dbt flags
        # Need to add profiles.yml file
        try:
            user_config = read_user_config(profiles_path)
        except Exception as err:
            print(f'[ERROR] DBTAdapter.open: {err}.')

            if not profiles_path.endswith('profiles.yaml') and \
                    not profiles_path.endswith('profiles.yml'):

                try:
                    user_config = read_user_config(os.path.join(profiles_path, 'profiles.yml'))
                except Exception as err2:
                    print(f'[ERROR] DBTAdapter.open: {err2}.')
                    raise err

        adapter_config = DBTAdapterConfig(
            project_dir=self.project_path,
            profiles_dir=profiles_path,
            target=self.target
        )
        flags.set_from_args(adapter_config, user_config)

        try:
            config = RuntimeConfig.from_args(adapter_config)
            reset_adapters()
            # register the correct adapter from config
            register_adapter(config)
            # load the adapter
            self.__adapter = get_adapter(config)
            # connect
            self.__adapter.acquire_connection('mage_dbt_adapter_' + uuid.uuid4().hex)
            return self
        except Exception as err:
            if is_debug():
                raise err
            print(f'[DBTAdapter] open: {err}.')

    def __enter__(self):
        return self.open()

    def __exit__(self, *args):
        try:
            self.close()
        except Exception as err:
            if is_debug():
                raise err
            print(f'[DBTAdapter] __exit__: {err}.')
