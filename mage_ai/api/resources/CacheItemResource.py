import json
import logging
from io import StringIO

from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.cache.constants import CacheItemType
from mage_ai.cache.dbt.cache import DBTCache
from mage_ai.cache.dbt.models import DBTCacheItem
from mage_ai.data_preparation.models.block.dbt.block import DBTBlock
from mage_ai.data_preparation.models.block.dbt.constants import LogLevel
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.server.kernel_output_parser import DataType


class CacheItemResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query, _meta, user, **kwargs):
        item_type = query.get('item_type', [None])
        if item_type:
            item_type = item_type[0]

        results = []

        if CacheItemType.DBT == item_type:
            cache = await DBTCache.initialize_cache_async(replace=False, root_project=True)
            results.extend(cache.get_cache_items())

        return self.build_result_set(
            sorted(results, key=lambda x: x.uuid),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk: str, user, **kwargs):
        query = kwargs.get('query') or {}

        item_type = query.get('item_type', [None])
        if item_type:
            item_type = item_type[0]

        project_path = query.get('project_path', [None])
        if project_path:
            project_path = project_path[0]

        model = DBTCacheItem.load(
            item={},
            item_type=item_type,
            uuid=pk,
        )

        if CacheItemType.DBT == item_type:
            block = DBTBlock.create(
                pk,
                pk,
                BlockType.DBT,
                language=BlockLanguage.SQL,
                configuration=dict(
                    file_path=pk,
                    file_source=dict(
                        path=pk,
                        project_path=project_path,
                    ),
                ),
            )
            lineage = [b.to_dict() for b in block.upstream_dbt_blocks(read_only=True)]
            model.block = block
            model.item = dict(
                content_compiled=block.content_compiled,
                upstream_blocks=lineage,
            )

        return self(model, user, **kwargs)

    async def update(self, payload, **kwargs):
        query = kwargs.get('query') or {}

        item_type = query.get('item_type', [None])
        if item_type:
            item_type = item_type[0]

        if CacheItemType.DBT == item_type:
            log_stream = StringIO()
            log_handler = logging.StreamHandler(log_stream)
            logger = logging.getLogger('CacheItemResource')
            logger.addHandler(log_handler)

            try:
                df = self.model.block.sample_data(
                    limit=100,
                    log_level=LogLevel.DEBUG,
                    logger=logger,
                )
                if df is not None:
                    columns = list(df.columns)
                    self.model.item['data'] = dict(
                        sample_data=dict(
                            columns=columns,
                            rows=json.loads(
                                df[columns].to_json(orient='split'),
                            )['data']
                        ),
                        shape=[len(df.index), len(columns)],
                        type=DataType.TABLE,
                    )
            except Exception as err:
                self.model.item['exception'] = str(err)

            self.model.item['logs'] = str(log_stream.getvalue())

        return self.model
