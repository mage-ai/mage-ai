from datetime import datetime

from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)
from mage_ai.tests.factory import create_pipeline_with_blocks


def get_pipeline(self):
    return Pipeline.get(self.pipeline.uuid)


class PipelineRunAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.pipeline2 = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
        )

        self.pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
        )
        self.pipeline_schedule2 = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
        )
        self.pipeline_schedule3 = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline2.uuid,
        )

        self.pipeline_run = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
        )
        self.pipeline_run2 = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule2.id,
            pipeline_uuid=self.pipeline_schedule.pipeline_uuid,
        )

        self.pipeline_run3 = PipelineRun.create(
            pipeline_schedule_id=self.pipeline_schedule3.id,
            pipeline_uuid=self.pipeline_schedule3.pipeline_uuid,
        )

        self.block_run = BlockRun.create(
            block_uuid=list(self.pipeline.blocks_by_uuid.keys())[0],
            pipeline_run_id=self.pipeline_run.id,
            status=BlockRun.BlockRunStatus.CANCELLED,
        )
        self.block_run2 = BlockRun.create(
            block_uuid=list(self.pipeline.blocks_by_uuid.keys())[1],
            pipeline_run_id=self.pipeline_run2.id,
            status=BlockRun.BlockRunStatus.CANCELLED,
        )
        self.block_run3 = BlockRun.create(
            block_uuid=list(self.pipeline2.blocks_by_uuid.keys())[0],
            pipeline_run_id=self.pipeline_run3.id,
            status=BlockRun.BlockRunStatus.CANCELLED,
        )

        self.pipeline_runs_count = len(PipelineRun.query.all())
        self.pipeline_runs_count_by_pipeline_schedule_id = {
            self.pipeline_schedule.id: 1,
            self.pipeline_schedule2.id: 1,
            self.pipeline_schedule3.id: 1,
        }


# No parent
build_list_endpoint_tests(
    PipelineRunAPIEndpointTest,
    list_count=3,
    resource='pipeline_run',
    result_keys_to_compare=[
        'backfill_id',
        'block_runs',
        'block_runs_count',
        'completed_at',
        'completed_block_runs_count',
        'created_at',
        'event_variables',
        'execution_date',
        'executor_type',
        'id',
        'metrics',
        'passed_sla',
        'pipeline_schedule_id',
        'pipeline_schedule_name',
        'pipeline_schedule_token',
        'pipeline_schedule_type',
        'pipeline_uuid',
        'started_at',
        'status',
        'updated_at',
        'variables',
    ],
)


# Query
build_list_endpoint_tests(
    PipelineRunAPIEndpointTest,
    list_count=2,
    resource='pipeline_run',
    build_query=lambda self: {
        'pipeline_uuid[]': [
            self.pipeline.uuid,
        ],
    },
    result_keys_to_compare=[
        'backfill_id',
        'block_runs',
        'block_runs_count',
        'completed_at',
        'completed_block_runs_count',
        'created_at',
        'event_variables',
        'execution_date',
        'executor_type',
        'id',
        'metrics',
        'passed_sla',
        'pipeline_schedule_id',
        'pipeline_schedule_name',
        'pipeline_schedule_token',
        'pipeline_schedule_type',
        'pipeline_uuid',
        'started_at',
        'status',
        'updated_at',
        'variables',
    ],
)


# Parent
build_list_endpoint_tests(
    PipelineRunAPIEndpointTest,
    list_count=1,
    resource='pipeline_run',
    resource_parent='pipeline_schedule',
    get_resource_parent_id=lambda self: self.pipeline_schedule.id,
    result_keys_to_compare=[
        'backfill_id',
        'block_runs',
        'block_runs_count',
        'completed_at',
        'completed_block_runs_count',
        'created_at',
        'event_variables',
        'execution_date',
        'executor_type',
        'id',
        'metrics',
        'passed_sla',
        'pipeline_schedule_id',
        'pipeline_schedule_name',
        'pipeline_schedule_token',
        'pipeline_schedule_type',
        'pipeline_uuid',
        'started_at',
        'status',
        'updated_at',
        'variables',
    ],
)

build_create_endpoint_tests(
    PipelineRunAPIEndpointTest,
    resource='pipeline_run',
    resource_parent='pipeline_schedule',
    get_resource_parent_id=lambda self: self.pipeline_schedule.id,
    assert_after_create_count=lambda self: len(
        PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == self.pipeline_schedule.id,
        ).all(),
    ) == self.pipeline_runs_count_by_pipeline_schedule_id[self.pipeline_schedule.id] + 1,
    assert_before_create_count=lambda self: len(
        PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == self.pipeline_schedule.id,
        ).all(),
    ) == self.pipeline_runs_count_by_pipeline_schedule_id[self.pipeline_schedule.id],
    build_payload=lambda self: dict(
        execution_date=datetime.utcnow(),
        variables=dict(fire=1),
    ),
)

build_detail_endpoint_tests(
    PipelineRunAPIEndpointTest,
    resource='pipeline_run',
    get_resource_id=lambda self: self.pipeline_run.id,
    result_keys_to_compare=[
        'backfill_id',
        'completed_at',
        'created_at',
        'event_variables',
        'execution_date',
        'executor_type',
        'id',
        'metrics',
        'passed_sla',
        'pipeline_schedule_id',
        'pipeline_uuid',
        'started_at',
        'status',
        'updated_at',
        'variables',
    ],
)


build_update_endpoint_tests(
    PipelineRunAPIEndpointTest,
    resource='pipeline_run',
    get_resource_id=lambda self: self.pipeline_run.id,
    build_payload=lambda self: dict(
        pipeline_run_action='retry_blocks',
    ),
    get_model_before_update=lambda self: BlockRun.query.get(self.block_run.id),
    assert_after_update=lambda
    self,
    result,
    model: BlockRun.BlockRunStatus.CANCELLED == model.status and
    BlockRun.BlockRunStatus.INITIAL == BlockRun.query.get(self.block_run.id).status,
)


build_delete_endpoint_tests(
    PipelineRunAPIEndpointTest,
    resource='pipeline_run',
    get_resource_id=lambda self: self.pipeline_run.id,
    assert_before_delete_count=lambda self: len(
        PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == self.pipeline_schedule.id,
        ).all(),
    ) == 1 and len(BlockRun.query.filter(
        BlockRun.pipeline_run_id == self.pipeline_run.id,
    ).all()) == 5,
    assert_after_delete_count=lambda self: len(
        PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == self.pipeline_schedule.id,
        ).all(),
    ) == 0 and len(BlockRun.query.filter(
        BlockRun.pipeline_run_id == self.pipeline_run.id,
    ).all()) == 0,
)
