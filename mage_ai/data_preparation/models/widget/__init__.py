from .charts import (
    MAX_BUCKETS,
    build_histogram_data,
)
from .constants import (
    ChartType,
    VARIABLE_NAMES_BY_CHART_TYPE,
    VARIABLE_NAME_BUCKETS,
)
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockStatus, BlockType
from mage_ai.shared.hash import ignore_keys, merge_dict
import numpy as np


class Widget(Block):
    def __init__(
        self,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **ignore_keys(kwargs, ['configuration']))
        self.configuration = kwargs.get('configuration', {})

    @classmethod
    def create(
        self,
        name,
        block_type,
        repo_path,
        **kwargs,
    ):
        return super().create(
            name,
            block_type,
            repo_path,
            widget=True,
            **kwargs,
        )

    @classmethod
    def block_class_from_type(self, block_type: str) -> str:
        return BLOCK_TYPE_TO_CLASS.get(block_type)

    @classmethod
    def get_block(
        self,
        name,
        uuid,
        block_type,
        status=BlockStatus.NOT_EXECUTED,
        pipeline=None,
        configuration=None,
    ):
        block_class = BLOCK_TYPE_TO_CLASS.get(block_type, Block)
        return block_class(
            name,
            uuid,
            block_type,
            status=status,
            pipeline=pipeline,
            configuration=configuration,
        )

    @property
    def chart_type(self):
        return self.configuration.get('chart_type')

    @property
    def output_variable_names(self):
        var_names = VARIABLE_NAMES_BY_CHART_TYPE.get(self.chart_type, [])
        return [self.configuration.get(var_name_orig) for var_name_orig in var_names]

    def delete(self):
        super().delete(widget=True)

    def get_variables_from_code_execution(self, results):
        data = {}
        for var_name in self.output_variable_names:
            data[var_name] = results.get(var_name)

        return data

    def to_dict(self, **kwargs):
        return merge_dict(super().to_dict(**kwargs), dict(
            configuration=self.configuration,
        ))

    def post_process_variables(self, variables):
        if ChartType.HISTOGRAM == self.chart_type:
            for var_name in self.output_variable_names:
                values = [v for v in variables[var_name] if v is not None and not np.isnan(v)]
                variables = build_histogram_data(
                    values,
                    int(self.configuration.get(VARIABLE_NAME_BUCKETS, MAX_BUCKETS)),
                )

        return variables


class ChartBlock(Widget):
    @property
    def output_variables(self):
        return dict()


BLOCK_TYPE_TO_CLASS = {
    BlockType.CHART: ChartBlock,
}
