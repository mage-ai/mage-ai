from typing import Dict, List, Union

from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.presenters.charts.data_sources.base import ChartDataSourceBase
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.strings import is_number


class ChartDataSourceBlock(ChartDataSourceBase):
    def load_data(
        self,
        partitions: Union[int, List[str]] = None,
        variables: Dict = None,
        **kwargs,
    ) -> List:
        block = self.pipeline.get_block(self.block_uuid)

        arr = []

        if partitions is not None and (not is_number(partitions) or partitions != 0):
            execution_partitions = []

            if isinstance(partitions, List):
                execution_partitions += partitions
            elif is_number(partitions):
                pipeline_runs = PipelineRun.query.filter(
                    PipelineRun.status == PipelineRun.PipelineRunStatus.COMPLETED,
                )

                if self.pipeline_uuid:
                    pipeline_runs = pipeline_runs.filter(
                        PipelineRun.pipeline_uuid == self.pipeline_uuid,
                    )

                if self.pipeline_schedule_id:
                    pipeline_runs = pipeline_runs.filter(
                        PipelineRun.pipeline_schedule_id == self.pipeline_schedule_id,
                    )

                if partitions >= 0:
                    pipeline_runs = pipeline_runs.order_by(
                        PipelineRun.execution_date.desc()
                    )
                else:
                    pipeline_runs = pipeline_runs.order_by(
                        PipelineRun.execution_date.asc()
                    )

                pipeline_runs = pipeline_runs.limit(abs(partitions))

                for pipeline_run in pipeline_runs.all():
                    execution_partitions.append(pipeline_run.execution_partition)

            for execution_partition in execution_partitions:
                output_variable_objects = block.output_variable_objects(
                    execution_partition=execution_partition,
                )

                for v in output_variable_objects:
                    arr.append(
                        self.pipeline.variable_manager.get_variable(
                            self.pipeline.uuid,
                            block.uuid,
                            v.uuid,
                        )
                    )
        elif block:
            block_output = block.execute_with_callback(
                global_vars=merge_dict(
                    get_global_variables(self.pipeline_uuid),
                    variables or {},
                ),
            )
            arr += block_output["output"] or []

        return arr
