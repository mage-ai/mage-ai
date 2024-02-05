from datetime import datetime
from typing import List

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.shared.hash import index_by


def seed(
    repo_path: str,
    pipelines: int = None,
    pipeline_schedules: int = None,
    pipeline_runs: int = None,
    block_runs: int = None,
):
    db_connection.start_session()

    pipeline_models = [Pipeline.get(
        uuid,
        repo_path=repo_path,
    ) for uuid in Pipeline.get_all_pipelines(repo_path=repo_path)]
    for i1 in range(pipelines - len(pipeline_models)):
        i = i1 + len(pipeline_models)
        model = Pipeline.create(name=f'Pipeline {i}', repo_path=repo_path)
        blocks = []
        types = [BlockType.DATA_LOADER, BlockType.TRANSFORMER, BlockType.DATA_EXPORTER]
        for i2 in range(3):
            block = Block.create(
                f'block_{i}_{i2}',
                types[i2 % len(types)],
                repo_path,
            )
            model.add_block(block, upstream_block_uuids=[b.uuid for b in blocks])
            blocks.append(block)
        pipeline_models.append(model)

    try:
        pipeline_schedules_models, pipeline_runs_models, block_runs_models = __process(
            pipelines=pipeline_models,
            pipeline_schedules=pipeline_schedules,
            pipeline_runs=pipeline_runs,
            block_runs=block_runs,
        )
        db_connection.session.commit()

        print(f'Created {len(pipeline_models)} pipelines')
        print(f'Created {len(pipeline_schedules_models)} pipeline schedules')
        print(f'Created {len(pipeline_runs_models)} pipeline runs')
        print(f'Created {len(block_runs_models)} block runs')
    except Exception as err:
        db_connection.session.rollback()
        [p.delete() for p in pipeline_models]
        raise err


def __process(
    pipelines: List[Pipeline],
    pipeline_schedules: int = None,
    pipeline_runs: int = None,
    block_runs: int = None,
):
    pipelines_count = len(pipelines)

    pipeline_schedules_models = []
    if pipeline_schedules is None:
        pipeline_schedules_models = PipelineSchedule.query.all()
    else:
        for i in range(pipeline_schedules):
            pipeline = pipelines[i % pipelines_count]
            model = PipelineSchedule(
                name=f'Pipeline Schedule {i}',
                pipeline_uuid=pipeline.uuid,
                schedule_interval=ScheduleInterval.DAILY,
                schedule_type=ScheduleType.TIME,
                start_time=datetime.utcnow(),
                status=ScheduleStatus.INACTIVE,
            )
            pipeline_schedules_models.append(model)

        db_connection.session.bulk_save_objects(
            pipeline_schedules_models,
            return_defaults=True,
        )

    pipeline_runs_models = []
    if pipeline_runs is None:
        pipeline_runs_models = PipelineRun.query.all()
    else:
        statuses = [
            PipelineRun.PipelineRunStatus.COMPLETED,
            PipelineRun.PipelineRunStatus.FAILED,
            PipelineRun.PipelineRunStatus.CANCELLED,
        ]
        pipeline_schedules_count = len(pipeline_schedules_models)
        for i in range(pipeline_runs):
            if (i + 1) % 100000 == 0:
                print('Creating pipeline runs', i + 1)

            pipeline_schedule = pipeline_schedules_models[i % pipeline_schedules_count]
            model = PipelineRun(
                completed_at=datetime.utcnow(),
                execution_date=datetime.utcnow(),
                pipeline_schedule_id=pipeline_schedule.id,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
                started_at=datetime.utcnow(),
                status=statuses[i % len(statuses)],
            )
            pipeline_runs_models.append(model)

        db_connection.session.bulk_save_objects(
            pipeline_runs_models,
            return_defaults=True,
        )

    pipelines_mapping = index_by(lambda x: x.uuid, pipelines)

    block_runs_models = []
    if block_runs is None:
        block_runs_models = BlockRun.query.all()
    else:
        statuses = [v.value for v in BlockRun.BlockRunStatus]
        pipeline_runs_count = len(pipeline_runs_models)
        for i in range(block_runs):
            if (i + 1) % 100000 == 0:
                print('Creating block runs', i + 1)

            pipeline_run = pipeline_runs_models[i % pipeline_runs_count]
            pipeline = pipelines_mapping[pipeline_run.pipeline_uuid]
            blocks = list(pipeline.blocks_by_uuid.values())

            model = BlockRun(
                block_uuid=blocks[i % len(blocks)].uuid,
                completed_at=datetime.utcnow(),
                pipeline_run_id=pipeline_run.id,
                started_at=datetime.utcnow(),
                status=statuses[i % len(statuses)],
            )
            block_runs_models.append(model)

        db_connection.session.bulk_save_objects(
            block_runs_models,
            return_defaults=True,
        )

    return pipeline_schedules_models, pipeline_runs_models, block_runs_models
