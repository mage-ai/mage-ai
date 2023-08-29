from typing import Dict

from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.presenters.charts.data_sources.base import ChartDataSourceBase
from mage_ai.shared.hash import merge_dict


class ChartDataSourceChartCode(ChartDataSourceBase):
    def load_data(
        self,
        variables: Dict = None,
        **kwargs,
    ):
        block = Widget.get_block(
            self.block_uuid,
            self.block_uuid,
            BlockType.CHART,
            language=BlockLanguage.PYTHON,
        )
        block_output = block.execute_with_callback(
            global_vars=merge_dict(
                get_global_variables(self.pipeline_uuid),
                variables or {},
            ),
        )

        return block_output['output'] or []
