from typing import Any, Dict, List, Optional

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import BlockRun


class DynamicBlockWrapperBase:
    def __init__(
        self,
        block: Any,
        block_run_id: Optional[int] = None,
        execution_partition: Optional[str] = None,
        logger: Optional[DictLogger] = None,
        *args,
        **kwargs,
    ):
        self.block = block
        self.block_run_id = block_run_id
        self.execution_partition = execution_partition
        self.logger = logger

        self._block_run = None
        self._block_runs = None
        self._pipeline_run = None

    def __getattr__(self, name):
        val = getattr(self.block, name)

        def _missing(val=val, *args, **kwargs):
            return val(*args, **kwargs)

        if callable(val):
            return _missing

        return val

    @property
    def pipeline(self) -> Pipeline:
        return self.block.pipeline

    def block_run(self) -> BlockRun:
        if self._block_run:
            return self._block_run

        self._block_run = BlockRun.query.get(self.block_run_id)

        return self._block_run

    def pipeline_run(self):
        if self._pipeline_run:
            return self._pipeline_run

        self._pipeline_run = self.block_run().pipeline_run

        return self._pipeline_run

    def block_runs(self) -> List[BlockRun]:
        if self._block_runs:
            return self._block_runs

        self._block_runs = BlockRun.query.filter(
            BlockRun.pipeline_run_id == self.block_run().pipeline_run_id,
        ).all()

        return self._block_runs

    def run_tests(self, **kwargs):
        pass

    def execute_sync(
        self,
        execution_partition: Optional[str] = None,
        logging_tags: Optional[Dict] = None,
        **kwargs,
    ) -> List[Dict]:
        raise Exception('Not implemented')
