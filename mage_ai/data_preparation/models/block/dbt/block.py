import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Union

import pandas as pd
import simplejson
from agate import Table

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.dbt_adapter import DBTAdapter
from mage_ai.data_preparation.models.block.dbt.sources import Sources
from mage_ai.data_preparation.models.constants import BlockLanguage
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.shared.parsers import encode_complex


class DBTBlock(Block):

    def __new__(cls, *args, **kwargs) -> 'DBTBlock':
        """
        Factory for the child blocks
        """
        # Import Child blocks here to prevent cycle import
        from mage_ai.data_preparation.models.block.dbt.block_sql import DBTBlockSQL
        from mage_ai.data_preparation.models.block.dbt.block_yaml import DBTBlockYAML
        if cls is DBTBlock:
            if kwargs.get('language', BlockLanguage.SQL) == BlockLanguage.YAML:
                return super(DBTBlock, cls).__new__(DBTBlockYAML)
            return super(DBTBlock, cls).__new__(DBTBlockSQL)
        else:
            return super(DBTBlock, cls).__new__(cls, *args, **kwargs)

    @property
    def project_path(self) -> Union[str, os.PathLike]:
        pass

    @property
    def base_project_path(self) -> Union[str, os.PathLike]:
        """
        Path to base dbt project of the mage repository

        Returns:
            Union[str, os.PathLike]: Path of base dbt project
        """
        return str(Path(self.repo_path) / 'dbt')

    def run_tests(
        self,
        **kwargs,
    ):
        """
        DBT Handles tests internally by running dbt `run`, `test`, or `build` command.
        Therefore we skip this step here.
        """
        return

    @property
    def _dbt_configuration(self) -> Dict[str, Any]:
        """
        The configuration of the dbt block

        Returns:
            Dict[str, Any]: dbt block config
        """
        config = self.configuration or {}
        return config.get('dbt') or {}

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
    def update_sources(cls, blocks_by_uuid: Dict[str, Block]) -> None:
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
            project_paths = set(
                block.project_path
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

            for project_path in project_paths:
                with DBTAdapter(str(project_path)) as dbt_adapter:
                    credentials = dbt_adapter.credentials
                    # some databases use other default schema names
                    # e.g. duckdb uses main schema as default
                    schema = getattr(credentials, 'schema', 'public')
                    database = getattr(credentials, 'database', None)

                Sources(project_path).reset_pipeline(
                    pipeline_uuid=pipeline_uuid,
                    block_uuids=block_uuids,
                    schema=schema,
                    database=database
                )

    @classmethod
    def materialize_df(
        cls,
        df: pd.DataFrame,
        pipeline_uuid: str,
        block_uuid: str,
        project_paths: List[str]
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
        df_dict = df.to_dict(orient='list')
        # For each project materialize df
        for project_path in project_paths:
            with DBTAdapter(str(project_path)) as dbt_adapter:
                credentials = dbt_adapter.credentials
                schema = getattr(credentials, 'schema', 'public')
                database = getattr(credentials, 'database', None)

                relation = dbt_adapter.get_relation(
                    database=database,
                    schema=schema,
                    identifier=f'mage_{pipeline_uuid}_{block_uuid}'
                )
                relation_context = dict(this=relation)

                table = Table(
                    rows=list(map(list, zip(*[v for _, v in df_dict.items()]))),
                    column_names=df_dict.keys()
                )

                dbt_adapter.execute_macro(
                    'reset_csv_table',
                    context_overide=relation_context,
                    model={'config': {}},
                    old_relation=relation,
                    full_refresh=True,
                    agate_table=table
                )

                dbt_adapter.execute_macro(
                    'load_csv_rows',
                    context_overide=relation_context,
                    model={'config': {}},
                    agate_table=table
                )
