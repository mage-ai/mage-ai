from mage_ai.presenters.charts.data_sources.base import ChartDataSourceBase
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
)


class ChartDataSourceChartCode(ChartDataSourceBase):
    def load_data(
        self,
        **kwargs,
    ):
        block = Widget.get_block(
            self.block_uuid,
            self.block_uuid,
            BlockType.CHART,
            language=BlockLanguage.PYTHON,
        )
