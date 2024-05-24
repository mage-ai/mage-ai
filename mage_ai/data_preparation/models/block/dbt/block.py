import csv
import os
from contextlib import contextmanager
from datetime import datetime
from logging import Logger
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Tuple, Union

import pandas as pd
import simplejson
from jinja2 import Template

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.constants import DBT_DIRECTORY_NAME
from mage_ai.data_preparation.models.block.dbt.dbt_adapter import DBTAdapter
from mage_ai.data_preparation.models.block.dbt.dbt_cli import DBTCli
from mage_ai.data_preparation.models.block.dbt.profiles import Profiles
from mage_ai.data_preparation.models.block.dbt.project import Project
from mage_ai.data_preparation.models.block.dbt.sources import Sources
from mage_ai.data_preparation.models.constants import BlockLanguage
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.parsers import encode_complex


class DBTBlock(Block):
    @classmethod
    def create(cls, *args, **kwargs) -> 'DBTBlock':
        """
        Factory for the child blocks
        """
        # Import Child blocks here to prevent cycle import
        from mage_ai.data_preparation.models.block.dbt.block_sql import DBTBlockSQL
        from mage_ai.data_preparation.models.block.dbt.block_yaml import DBTBlockYAML
        if kwargs.get('language', BlockLanguage.SQL) == BlockLanguage.YAML:
            return DBTBlockYAML(*args, **kwargs)
        return DBTBlockSQL(*args, **kwargs)

    @property
    def base_project_path(self) -> Union[str, os.PathLike]:
        """
        Path to base dbt project of the mage repository

        Returns:
            Union[str, os.PathLike]: Path of base dbt project
        """
        # /home/src/default_repo becomes /home/src/default_repo/dbt
        return str(Path(self.repo_path) / DBT_DIRECTORY_NAME)

    @property
    def project_path(self) -> Union[str, os.PathLike]:
        pass

    @property
    def _dbt_configuration(self) -> Dict[str, Any]:
        """
        The configuration of the dbt block

        Returns:
            Dict[str, Any]: dbt block config
        """
        config = self.configuration or {}
        return config.get(DBT_DIRECTORY_NAME) or {}

    def target(self, variables: Dict = None) -> str:
        if variables is None:
            variables = dict()
        target = (self.configuration or {}).get('dbt_profile_target')
        if target:
            return Template(target).render(
                variables=lambda x: variables.get(x) if variables else None,
                **get_template_vars(),
            )
        profile_name = Project(self.project_path).project.get('profile')
        return Profiles(self.project_path).profiles.get(profile_name).get('target')

    def run_tests(
        self,
        **kwargs,
    ):
        """
        DBT Handles tests internally by running dbt `run`, `test`, or `build` command.
        Therefore we skip this step here.
        """
        return

    def update_upstream_blocks(
        self,
        upstream_blocks: List[Any],
        variables: Dict = None,
        **kwargs,
    ) -> None:
        """
        Update the upstream blocks of the DBT block.
        Args:
            upstream_blocks (List[Any]): The list of upstream blocks.
        """
        upstream_blocks_previous = self.upstream_blocks
        super().update_upstream_blocks(upstream_blocks)

        if BlockLanguage.SQL != self.language or self.pipeline is None:
            return

        upstream_blocks_previous_by_uuid = {b.uuid: b for b in upstream_blocks_previous}
        upstream_blocks_by_uuid = {b.uuid: b for b in self.upstream_blocks}

        removed_upstream_blocks = [
            b for b in upstream_blocks_previous if b.uuid not in upstream_blocks_by_uuid]
        new_upstream_blocks = [
            b for b in self.upstream_blocks if b.uuid not in upstream_blocks_previous_by_uuid]

        if any(not isinstance(b, self.__class__)
               for b in (removed_upstream_blocks + new_upstream_blocks)):
            self.__class__.update_sources(
                self.pipeline.blocks_by_uuid, variables=self.pipeline.variables)

    @classmethod
    def _variables_json(self, variables: Dict[str, Any]) -> str:
        """
        Serializes dict into json

        Args:
            variables (Dict[str, Any]): variables as json, which can be passed as cli argument

        Returns:
            str: serialized variables dict as json
        """
        return simplejson.dumps(
            {
                k: v
                for k, v in variables.items()
                if PIPELINE_RUN_MAGE_VARIABLES_KEY != k and (
                    type(v) is str or
                    type(v) is int or
                    type(v) is bool or
                    type(v) is float or
                    type(v) is dict or
                    type(v) is list or
                    type(v) is datetime
                )
            },
            default=encode_complex,
            ignore_nan=True,
        )

    @classmethod
    def materialize_df(
        cls,
        df: pd.DataFrame,
        pipeline_uuid: str,
        block_uuid: str,
        targets: List[Tuple[Union[str, os.PathLike], str]],
        logger: Logger = None,
        global_vars: Optional[Dict[str, Any]] = None,
        runtime_arguments: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Materialize a dataframe for use with a DBTBlock.
        The df is materialized based on the dbt profile configuration as:
        `"{default_database}"."{default_schema}"."mage_{pipeline_uuid}_{block_uuid}"`

        Args:
            df (pd.DataFrame): dataframe to materialize
            pipeline_uuid (str): pipeline uuid of the block, which generated the df
            block_uuid (str): block uuid of the block, which generated the df
            project_paths (List[str]): dbt projects, for which the block should be materialized
        """
        # Get variables
        variables = merge_dict(global_vars or {}, runtime_arguments or {})

        for (project_path, target) in targets:
            seed_dir_name = Project(project_path).project.get('seed-paths', ['seeds'])[0]
            seed_path = Path(
                project_path,
                seed_dir_name,
                f'mage_{pipeline_uuid}',
                f'mage_{pipeline_uuid}_{block_uuid}.csv'
            )
            seed_path.parent.mkdir(parents=True, exist_ok=True)
            df.to_csv(seed_path, quoting=csv.QUOTE_NONNUMERIC, index=False)

            template_vars = get_template_vars()
            target = Template(target).render(
                variables=lambda x: variables.get(x) if variables else None,
                **template_vars,
            )

            # Interpolate profiles.yml and invoke dbt
            with Profiles(project_path, variables) as profiles:
                args = [
                    'seed',
                    '--project-dir', project_path,
                    '--profiles-dir', profiles.profiles_dir,
                    '--target', target,
                    '--select', f'mage_{pipeline_uuid}_{block_uuid}',
                    '--vars', cls._variables_json(merge_dict(variables, template_vars)),
                    '--full-refresh'
                ]
                DBTCli(logger=logger).invoke(args)

            seed_path.unlink()

    @classmethod
    def update_sources(
        cls,
        blocks_by_uuid: Dict[str, Block],
        variables: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Update the mage_sources.yml for each dbt project in the pipeline based on the pipeline
        blocks. Every non dbt block of langauge SQL, Python or R, which has a downstream
        dbt block will be added.

        Args:
            blocks_by_uuid (Dict[str, Block]): Dictionary of blocks by uuid
        """
        # only run if blocks_by_uuid is not empty
        if blocks_by_uuid:
            # get all dbt project, which needs to be updated
            targets = set(
                (block.project_path, block.target(variables=variables))
                for _uuid, block in blocks_by_uuid.items()
                if isinstance(block, DBTBlock)
            )
            pipeline_uuid = list(blocks_by_uuid.values())[0].pipeline.uuid

            # get all non dbt blocks, which have downstream dbt blocks
            block_uuids = list(set(
                uuid
                for uuid, block in blocks_by_uuid.items()
                if (
                    not isinstance(block, DBTBlock) and
                    block.language in [BlockLanguage.SQL, BlockLanguage.PYTHON, BlockLanguage.R] and
                    any(
                        isinstance(downstream_block, DBTBlock)
                        for downstream_block in block.downstream_blocks
                    )
                )
            ))

            if block_uuids:
                for (project_path, target) in targets:
                    try:
                        try:
                            with DBTAdapter(
                                project_path,
                                variables=variables,
                                target=target
                            ) as dbt_adapter:
                                credentials = dbt_adapter.credentials
                                # some databases use other default schema names
                                # e.g. duckdb uses main schema as default
                                schema = getattr(credentials, 'schema', None)

                            Sources(project_path).reset_pipeline(
                                project_name=Path(project_path).stem,
                                pipeline_uuid=pipeline_uuid,
                                block_uuids=block_uuids,
                                schema=schema
                            )
                        # project not yet configured correctly, so just skip that step for now
                        except FileNotFoundError:
                            pass
                    except Exception as err:
                        if is_debug():
                            raise err
                        else:
                            print(f'[DBTBlock] update_sources: {err}')

    @contextmanager
    def _redirect_streams(
        self,
        **kwargs
    ) -> Generator[None, None, None]:
        yield (None, None)

    def set_default_configurations(self):
        pass
