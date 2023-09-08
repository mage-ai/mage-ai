import os
import re
from typing import Dict, List, Tuple

import yaml

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.profile import DBTProfileHandler
from mage_ai.data_preparation.models.block.sql import (
    bigquery,
    clickhouse,
    mssql,
    mysql,
    postgres,
    redshift,
    snowflake,
    spark,
    trino,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.io.base import DataSource
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.strings import remove_extension_from_filename
from mage_ai.shared.utils import clean_name, files_in_path


class DBTUpstreamHandler:

    @classmethod
    def update_model_settings(
        cls,
        block: 'Block',
        upstream_blocks: List['Block'],
        upstream_blocks_previous: List['Block'],
        force_update: bool = False,
        variables: Dict = None,
    ):
        attributes_dict = DBTProfileHandler.parse_attributes(block, variables=variables)

        sources_full_path = attributes_dict['sources_full_path']
        source_name = attributes_dict['source_name']

        if not force_update and len(upstream_blocks_previous) > len(upstream_blocks):
            # TODO (tommy dangerous): should we remove sources?
            # How do we know no other model is using a source?

            # uuids = [b.uuid for b in upstream_blocks]
            # for upstream_block in upstream_blocks_previous:
            #     if upstream_block.uuid in uuids:
            #         continue

            #     # If upstream block that’s being removed has a downstream block that is
            #     # a DBT block
            #     if any([block.type == b.type for b in upstream_block.downstream_blocks]):
            #         continue

            #     if os.path.exists(sources_full_path):
            #         with open(sources_full_path, 'r') as f:
            #             settings = yaml.safe_load(f) or {}
            #             source = find(lambda x: x['name'] == source_name, settings.get(
            #                 'sources', [])
            #             )
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

                table_name = cls.source_table_name_for_block(upstream_block)
                settings = cls.__add_table_to_source(
                    block,
                    cls.__load_sources(block, variables=variables),
                    source_name,
                    table_name,
                )

                with open(sources_full_path, 'w') as f:
                    yaml.safe_dump(settings, f)

    @classmethod
    def create_upstream_tables(
        cls,
        block,
        profile_target: str,
        cache_upstream_dbt_models: bool = False,
        variables: Dict = None,
        **kwargs,
    ) -> None:
        if len([b for b in block.upstream_blocks if BlockType.SENSOR != b.type]) == 0:
            return

        config_file_loader, configuration = DBTProfileHandler.config_file_loader_and_configuration(
            block,
            profile_target,
            variables=variables,
        )

        data_provider = configuration.get('data_provider')

        kwargs_shared = merge_dict(dict(
            configuration=configuration,
            cache_upstream_dbt_models=cache_upstream_dbt_models,
            variables=variables,
        ), kwargs)

        upstream_blocks_init = block.upstream_blocks
        upstream_blocks = cls.__upstream_blocks_from_sources(block, variables=variables)
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
        elif DataSource.CLICKHOUSE == data_provider:
            from mage_ai.io.clickhouse import ClickHouse

            loader = ClickHouse.with_config(config_file_loader)
            clickhouse.create_upstream_block_tables(
                loader,
                block,
                **kwargs_shared,
            )

        block.upstream_blocks = upstream_blocks_init

    @classmethod
    def add_blocks_upstream_from_refs(
        cls,
        block: 'Block',
        add_current_block: bool = False,
        downstream_blocks: List['Block'] = None,
        read_only: bool = False,
        variables: Dict = None,
    ) -> None:
        if downstream_blocks is None:
            downstream_blocks = []
        attributes_dict = DBTProfileHandler.parse_attributes(block, variables=variables)
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
        for _, ref in enumerate(cls.__extract_refs(block.content)):
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
                new_block.upstream_blocks = cls.add_blocks_upstream_from_refs(
                    new_block,
                    read_only=read_only,
                    variables=variables,
                )
                added_blocks += new_block.upstream_blocks
            else:
                existing_block = block.pipeline.get_block(
                    uuid,
                    block.type,
                )
                if existing_block is None:
                    new_block = block.__class__.create(
                        uuid,
                        block.type,
                        get_repo_path(),
                        configuration=configuration,
                        language=block.language,
                        pipeline=block.pipeline,
                    )
                else:
                    new_block = existing_block

            added_blocks.append(new_block)
            current_upstream_blocks.append(new_block)

        if add_current_block:
            arr = []
            for b in current_upstream_blocks:
                arr.append(b)
            block.upstream_blocks = arr
            added_blocks.append(block)

        return added_blocks

    @classmethod
    def __upstream_blocks_from_sources(cls, block: Block, variables: Dict = None) -> List[Block]:
        mapping = {}
        sources = cls.__extract_sources(block.content)
        for tup in sources:
            source_name, table_name = tup
            if source_name not in mapping:
                mapping[source_name] = {}
            mapping[source_name][table_name] = True

        attributes_dict = DBTProfileHandler.parse_attributes(block, variables=variables)
        source_name = attributes_dict['source_name']

        arr = []
        for b in block.upstream_blocks:
            table_name = cls.source_table_name_for_block(b)
            if mapping.get(source_name, {}).get(table_name):
                arr.append(b)

        return arr

    @classmethod
    def __extract_sources(cls, block_content) -> List[Tuple[str, str]]:
        return re.findall(
            r"{}[ ]*source\(['\"]+([\w]+)['\"]+[,]+[ ]*['\"]+([\w]+)['\"]+\)[ ]*{}".format(
                r'\{\{',
                r'\}\}',
            ),
            block_content,
        )

    @classmethod
    def source_table_name_for_block(cls, block) -> str:
        return f'{clean_name(block.pipeline.uuid)}_{clean_name(block.uuid)}'

    @classmethod
    def __add_table_to_source(
        cls,
        block: 'Block',
        settings: Dict,
        source_name: str,
        table_name: str
    ) -> None:
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

    @classmethod
    def __get_source(cls, block, variables: Dict = None) -> Dict:
        attributes_dict = DBTProfileHandler.parse_attributes(block, variables=variables)
        source_name = attributes_dict['source_name']
        settings = cls.__load_sources(block, variables=variables)
        return find(lambda x: x['name'] == source_name, settings.get('sources', []))

    @classmethod
    def __load_sources(cls, block, variables: Dict = None) -> Dict:
        attributes_dict = DBTProfileHandler.parse_attributes(block, variables=variables)
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
                        print(
                            f'Adding source {source_name} and table {table_name} '
                            f'to {sources_full_path}.'
                        )
                        settings = cls.__add_table_to_source(block,
                                                             settings,
                                                             source_name,
                                                             table_name)

                with open(sources_full_path_legacy, 'w') as f:
                    print(f'Deleting legacy dbt source file at {sources_full_path_legacy}.')
                    yaml.safe_dump(settings, f)

            os.remove(sources_full_path_legacy)

        return settings

    @classmethod
    def __extract_refs(cls, block_content) -> List[str]:
        return re.findall(
            r"{}[ ]*ref\(['\"]+([\w]+)['\"]+\)[ ]*{}".format(r'\{\{', r'\}\}'),
            block_content,
        )
