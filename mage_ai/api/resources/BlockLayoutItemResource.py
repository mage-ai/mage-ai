import json
import os
import re
import traceback
import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.widget.constants import ChartType
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.presenters.charts.data_sources.block import ChartDataSourceBlock
from mage_ai.presenters.charts.data_sources.block_runs import ChartDataSourceBlockRuns
from mage_ai.presenters.charts.data_sources.chart_code import ChartDataSourceChartCode
from mage_ai.presenters.charts.data_sources.constants import ChartDataSourceType
from mage_ai.presenters.charts.data_sources.pipeline_runs import (
    ChartDataSourcePipelineRuns,
)
from mage_ai.presenters.charts.data_sources.pipeline_schedules import (
    ChartDataSourcePipelineSchedules,
)
from mage_ai.presenters.charts.data_sources.pipelines import ChartDataSourcePipelines
from mage_ai.shared.hash import extract, merge_dict
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class BlockLayoutItemResource(GenericResource):
    @classmethod
    async def member(self, pk, user, **kwargs):
        variables = {}
        query = kwargs.get('query') or {}
        for k, v in query.items():
            if re.match(r'[\w-]+\[\]$', k):
                variables[k] = v
            elif isinstance(v, list) and len(v) >= 1:
                variables[k] = v[0]
            else:
                variables[k] = v

        configuration_override = variables.pop('configuration_override', None)
        if configuration_override:
            configuration_override = json.loads(urllib.parse.unquote(configuration_override))
        data_source_override = variables.pop('data_source_override', None)
        if data_source_override:
            data_source_override = json.loads(urllib.parse.unquote(data_source_override))

        page_block_layout = kwargs.get('parent_model')

        uuid = urllib.parse.unquote(pk)
        block_config = page_block_layout.blocks.get(uuid) or {}
        file_path = block_config.get('file_path')
        block_uuid = os.path.join(*file_path.split(os.path.sep)[1:]) if file_path else uuid

        if not block_config:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        content = None
        data = None
        block_type = block_config.get('type')

        if BlockType.CHART == block_type:
            data_source_config = block_config.get('data_source') or {}
            if data_source_override:
                if data_source_config:
                    data_source_config.update(data_source_override)
                else:
                    data_source_config = data_source_override

            configuration_to_use = configuration_override or block_config.get('configuration')

            if data_source_config or ChartType.CUSTOM == configuration_to_use.get('chart_type'):
                data_source_type = data_source_config.get('type')
                pipeline_uuid = data_source_config.get('pipeline_uuid')

                block = Block.get_block(
                    block_config.get('name') or file_path or uuid,
                    block_uuid,
                    block_type,
                    configuration=configuration_to_use,
                    **extract(block_config, [
                        'language',
                    ]),
                )

                content = block.content

                if ChartDataSourceType.CHART_CODE == data_source_type:
                    data_source = ChartDataSourceChartCode(
                        block_uuid=block.uuid,
                        pipeline_uuid=pipeline_uuid,
                    )
                    data = data_source.load_data(block=block)
                else:
                    data_source_block_uuid = data_source_config.get('block_uuid')

                    data_source_class_options = merge_dict(extract(data_source_config, [
                        'pipeline_schedule_id',
                    ]), dict(
                        block_uuid=data_source_block_uuid,
                        pipeline_uuid=pipeline_uuid,
                    ))
                    data_source_output = None

                    if ChartDataSourceType.BLOCK == data_source_type:
                        data_source = ChartDataSourceBlock(**data_source_class_options)
                        if data_source.block_uuid:
                            data_source_output = data_source.load_data(
                                partitions=data_source_config.get('partitions'),
                            )
                    elif ChartDataSourceType.PIPELINES == data_source_type:
                        data_source = ChartDataSourcePipelines(**data_source_class_options)
                        data_source_output = await data_source.load_data(
                            user=user,
                            **kwargs,
                        )
                    elif ChartDataSourceType.PIPELINE_SCHEDULES == data_source_type:
                        data_source = ChartDataSourcePipelineSchedules(**data_source_class_options)
                        data_source_output = await data_source.load_data(
                            user=user,
                            **kwargs,
                        )
                    elif ChartDataSourceType.PIPELINE_RUNS == data_source_type:
                        data_source = ChartDataSourcePipelineRuns(**data_source_class_options)
                        data_source_output = await data_source.load_data(
                            user=user,
                            **kwargs,
                        )
                    elif ChartDataSourceType.BLOCK_RUNS == data_source_type:
                        data_source = ChartDataSourceBlockRuns(**data_source_class_options)
                        data_source_output = await data_source.load_data(
                            user=user,
                            **kwargs,
                        )

                    try:
                        input_args = None
                        if data_source_output is not None:
                            input_args = [data_source_output]

                        data = block.execute_with_callback(
                            disable_json_serialization=True,
                            input_args=input_args,
                            global_vars=merge_dict(
                                get_global_variables(pipeline_uuid) if pipeline_uuid else {},
                                variables or {},
                            ),
                        ).get('output', None)
                    except Exception as err:
                        error = ApiError(ApiError.RESOURCE_NOT_FOUND.copy())
                        error.message = str(err)
                        error.errors = traceback.format_exc()
                        raise error

        block_config_to_show = {}
        block_config_to_show.update(block_config)

        if configuration_override:
            block_config_to_show['configuration'] = configuration_override
        if data_source_override:
            block_config_to_show['data_source'] = data_source_override

        await UsageStatisticLogger().chart_impression(block_config_to_show)

        return self(merge_dict(block_config_to_show, dict(
            content=content,
            data=data,
            uuid=uuid,
        )), user, **kwargs)
