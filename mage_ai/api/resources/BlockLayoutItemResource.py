import os
import re
import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.presenters.charts.data_sources.block import ChartDataSourceBlock
from mage_ai.presenters.charts.data_sources.chart_code import ChartDataSourceChartCode
from mage_ai.presenters.charts.data_sources.constants import ChartDataSourceType
from mage_ai.shared.hash import extract, merge_dict


class BlockLayoutItemResource(GenericResource):
    @classmethod
    def member(self, pk, user, **kwargs):
        variables = {}
        query = kwargs.get('query') or {}
        for k, v in query.items():
            if re.match(r'[\w-]+\[\]$', k):
                variables[k] = v
            elif isinstance(v, list) and len(v) >= 1:
                variables[k] = v[0]
            else:
                variables[k] = v

        page_block_layout = kwargs.get('parent_model')

        uuid = urllib.parse.unquote(pk)
        block_config = page_block_layout.blocks.get(uuid)
        block_config_uuid = block_config.get('uuid') or uuid

        if not block_config:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        data = None
        block_type = block_config.get('type')

        if BlockType.CHART == block_type:
            data_source_config = block_config.get('data_source')
            if data_source_config:
                data_source_type = data_source_config.get('type')
                pipeline_uuid = data_source_config.get('pipeline_uuid')

                block = Block.get_block(
                    block_config.get('name') or block_config_uuid,
                    os.path.join(*block_config_uuid.split(os.path.sep)[1:]),
                    block_type,
                    **extract(block_config, [
                        'configuration',
                        'language',
                    ]),
                )

                if ChartDataSourceType.CHART_CODE == data_source_type:
                    data_source = ChartDataSourceChartCode(
                        block_uuid=block.uuid,
                        pipeline_uuid=pipeline_uuid,
                    )
                    data = data_source.load_data(block=block)
                else:
                    data_source_class_options = merge_dict(extract(data_source_config, [
                        'block_uuid',
                        'pipeline_schedule_id',
                    ]), dict(pipeline_uuid=pipeline_uuid))
                    data_source_output = None

                    if ChartDataSourceType.BLOCK == data_source_type:
                        data_source = ChartDataSourceBlock(**data_source_class_options)
                        data_source_output = data_source.load_data(
                            partitions=data_source_config.get('partitions'),
                        )

                    data = block.execute_with_callback(
                        disable_json_serialization=True,
                        input_args=[data_source_output] if data_source_output else None,
                        global_vars=merge_dict(
                            get_global_variables(pipeline_uuid) if pipeline_uuid else {},
                            variables or {},
                        ),
                    )

        return self(dict(
            data=data,
        ), user, **kwargs)
