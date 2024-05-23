from dataclasses import dataclass
from typing import Any, List

from mage_ai.data.models.outputs.query import BlockOutputQuery
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

    def get_outputs(self, **kwargs) -> List[Any]:
        output_query = BlockOutputQuery(
            block=self.block, block_uuid=self.block_uuid, pipeline=self.pipeline
        )
        return [
            output.render()
            for output in output_query.fetch(
                partition=self.execution_partition,
            )
        ]
