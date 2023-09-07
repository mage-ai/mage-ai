import pandas as pd
from typing import Dict

from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.presenters.charts.data_sources.base import ChartDataSourceBase
from mage_ai.shared.hash import merge_dict
from mage_ai.api.resources.PipelineResource import PipelineResource


class ChartDataSourcePipelines(ChartDataSourceBase):
    async def load_data(
        self,
        user = None,
        meta: Dict = None,
        variables: Dict = None,
        **kwargs,
    ):
        pipelines = await PipelineResource.collection(variables or {}, meta or {}, user)
        rows = [dict(
            created_at=pipeline.created_at,
            description=pipeline.description,
            executor_type=pipeline.executor_type,
            name=pipeline.name,
            tags=pipeline.tags,
            type=pipeline.type,
            updated_at=pipeline.updated_at,
            uuid=pipeline.uuid,
        ) for pipeline in pipelines]

        return pd.DataFrame(rows)
