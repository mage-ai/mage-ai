from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)


class BlockRunAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.pipeline_run = PipelineRun.create(
            pipeline_schedule_id=1,
            pipeline_uuid=self.pipeline.uuid,
        )
        self.block_runs_count = len(BlockRun.query.all())
        BlockRun.create(
            block_uuid=1,
            pipeline_run_id=self.pipeline_run.id,
        )

    def tearDown(self):
        super().tearDown()
        BlockRun.query.delete()
        PipelineRun.query.delete()


build_list_endpoint_tests(
    BlockRunAPIEndpointTest,
    resource='block_runs',
    get_list_count=lambda self: self.block_runs_count + 1,
    get_resource_parent_id=lambda self: self.pipeline_run.id,
    resource_parent='pipeline_runs',
)
