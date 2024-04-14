from dataclasses import dataclass
from typing import Any, List

from mage_ai.shared.models import BaseDataClass


@dataclass
class RemoteBlock(BaseDataClass):
    block_uuid: str
    execution_partition: str = None
    pipeline_uuid: str = None
    repo_path: str = None

    def __post_init__(self):
        self._block = None
        self._pipeline = None

    @property
    def pipeline(self):
        from mage_ai.data_preparation.models.pipeline import Pipeline

        if self._pipeline:
            return self._pipeline

        self._pipeline = Pipeline.get(
            self.pipeline_uuid,
            all_projects=True,
            check_if_exists=False,
            repo_path=self.repo_path,
            use_repo_path=True if self.repo_path else False,
        )

        return self._pipeline

    @property
    def block(self):
        if self._block:
            return self._block

        self._block = self.pipeline.get_block(self.block_uuid)

        return self._block

    @property
    def variable_uuids(self):
        return self.block.output_variables(execution_partition=self.execution_partition)

    def get_outputs(self, **kwargs) -> List[Any]:
        arr = []
        for variable_uuid in self.variable_uuids:
            output = self.pipeline.get_block_variable(
                self.block_uuid,
                variable_uuid,
                partition=self.execution_partition,
            )
            arr.append(output)

        return arr
