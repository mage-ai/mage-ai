import os
from datetime import datetime, timedelta
from typing import Dict, Union

from faker import Faker

from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType, PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleType
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.orchestration.db.models.schedules import (
    Backfill,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.shared.hash import extract, ignore_keys, merge_dict

faker = Faker()


def create_pipeline(name: str, repo_path: str):
    pipeline = Pipeline.create(
        name,
        repo_path=repo_path,
    )
    return pipeline


def create_pipeline_with_blocks(
    name: str,
    repo_path: str,
    pipeline_type: PipelineType = None,
    return_blocks: bool = False,
):
    """
    Creates a pipeline with blocks for data processing and transformation.

    Args:
        name (str): The name of the pipeline.
        repo_path (str): The path to the repository where the pipeline and blocks are stored.

    Returns:
        Pipeline: The created pipeline with added blocks.
    """
    pipeline = Pipeline.create(
        name,
        repo_path=repo_path,
        pipeline_type=pipeline_type,
    )
    block1 = Block.create('block1', 'data_loader', repo_path, language='python')
    block2 = Block.create('block2', 'transformer', repo_path, language='python')
    block3 = Block.create('block3', 'transformer', repo_path, language='python')
    block4 = Block.create('block4', 'data_exporter', repo_path, language='python')
    pipeline.add_block(block1)
    pipeline.add_block(block2, upstream_block_uuids=['block1'])
    pipeline.add_block(block3, upstream_block_uuids=['block1'])
    pipeline.add_block(block4, upstream_block_uuids=['block2', 'block3'])

    if return_blocks:
        return pipeline, [block1, block2, block3, block4]

    return pipeline


def create_integration_pipeline_with_blocks(name: str, repo_path: str):
    pipeline = Pipeline.create(
        name,
        pipeline_type=PipelineType.INTEGRATION,
        repo_path=repo_path,
    )
    with open(
        os.path.join(os.path.dirname(__file__), 'test_data_integration_catalog.json'),
        'r',
    ) as f:
        config = f.read()
        with open(pipeline.catalog_config_path, 'w') as f:
            f.write(config)
    block1 = Block.create(
        'test integration source',
        'data_loader',
        repo_path,
        language='yaml',
    )
    with open(block1.file_path, 'w') as f:
        f.write(
            '''config:
  host: host
  port: 22
source: sftp
'''
        )
    block2 = Block.create(
        'test integration transform',
        'transformer',
        repo_path,
        language='python',
    )
    block3 = Block.create(
        'test integration destination',
        'data_exporter',
        repo_path,
        language='yaml',
    )
    with open(block3.file_path, 'w') as f:
        f.write(
            '''config:
  database: postgres
  schema: public
  host: localhost
  port: 5432
  username: postgres
  password: postgres
destination: postgresql
'''
        )
    pipeline.add_block(block1)
    pipeline.add_block(block2, upstream_block_uuids=['block1'])
    pipeline.add_block(block3, upstream_block_uuids=['block2'])
    return pipeline


def create_pipeline_with_dynamic_blocks(name: str, repo_path: str):
    pipeline = Pipeline.create(
        name,
        repo_path=repo_path,
    )
    block1 = Block.create(
        'block1',
        'data_loader',
        repo_path,
        language='python',
        configuration=dict(dynamic=True),
    )
    block2 = Block.create('block2', 'transformer', repo_path, language='python')
    block3 = Block.create('block3', 'data_exporter', repo_path, language='python')
    pipeline.add_block(block1)
    pipeline.add_block(block2, upstream_block_uuids=['block1'])
    pipeline.add_block(block3, upstream_block_uuids=['block2'])
    return pipeline


def create_pipeline_run(pipeline_uuid: str, **kwargs):
    pipeline_run = PipelineRun.create(pipeline_uuid='test_pipeline', **kwargs)
    return pipeline_run


def create_pipeline_run_with_schedule(
    pipeline_uuid: str,
    execution_date: datetime = None,
    pipeline_schedule_id: int = None,
    pipeline_schedule_settings: Dict = None,
    **kwargs,
):
    if pipeline_schedule_settings is None:
        pipeline_schedule_settings = dict()
    if pipeline_schedule_id is None:
        pipeline_schedule = PipelineSchedule.create(
            name=f'{pipeline_uuid}_trigger',
            pipeline_uuid=pipeline_uuid,
            schedule_type=ScheduleType.TIME,
            settings=pipeline_schedule_settings,
        )
        pipeline_schedule_id = pipeline_schedule.id
    pipeline_run = PipelineRun.create(
        execution_date=execution_date,
        pipeline_uuid=pipeline_uuid,
        pipeline_schedule_id=pipeline_schedule_id,
        **kwargs,
    )
    return pipeline_run


def create_backfill(
    pipeline_uuid: str,
    end_datetime: datetime = None,
    interval_type: Backfill.IntervalType = Backfill.IntervalType.DAY,
    interval_units: int = 1,
    pipeline_schedule_id: int = None,
    start_datetime: datetime = None,
    **kwargs,
):
    if start_datetime is None:
        start_datetime = datetime.today() - timedelta(days=1)
    if end_datetime is None:
        end_datetime = datetime.today()
    if pipeline_schedule_id is None:
        pipeline_schedule = PipelineSchedule.create(
            name=f'{pipeline_uuid}_trigger',
            pipeline_uuid=pipeline_uuid,
            schedule_type=ScheduleType.TIME,
        )
        pipeline_schedule_id = pipeline_schedule.id
    backfill = Backfill.create(
        end_datetime=end_datetime,
        interval_type=interval_type,
        interval_units=interval_units,
        pipeline_uuid=pipeline_uuid,
        pipeline_schedule_id=pipeline_schedule_id,
        start_datetime=start_datetime,
        status=Backfill.Status.INITIAL,
        **kwargs,
    )

    return backfill


def create_user(
    as_dict: bool = False,
    save: bool = True,
    password: str = None,
    **kwargs,
) -> Union[Dict, User]:
    password = password or faker.password()
    password_salt = generate_salt()
    password_hash = create_bcrypt_hash(password, password_salt)
    payload = merge_dict(
        dict(
            email=faker.email(),
            username=faker.name(),
        ),
        kwargs,
    )

    if as_dict:
        payload.update(password=password)
        return payload

    user = User(
        password_hash=password_hash,
        password_salt=password_salt,
        **payload,
    )
    if save:
        user.save()

    return user


async def build_pipeline_with_blocks_and_content(
    test_case,
    block_settings: Dict = None,
    name: str = None,
    pipeline_type: PipelineType = None,
) -> Pipeline:
    repo_path = test_case.repo_path

    pipeline = Pipeline.create(
        name or test_case.faker.unique.name(),
        repo_path=repo_path,
        pipeline_type=pipeline_type or PipelineType.PYTHON,
    )

    blocks = []
    for idx, block_dict in enumerate([
        {},
        {},
        {},
        {},
    ]):
        block = Block.create(
            f'block{idx}_{test_case.faker.unique.name()}',
            **merge_dict(
                merge_dict(dict(
                    block_type=BlockType.DATA_LOADER,
                    repo_path=repo_path,
                ), block_dict or {}),
                ignore_keys(
                    block_settings[idx] if block_settings and idx in block_settings else {},
                    [
                        'content',
                    ],
                ),
            ),
        )

        pipeline.add_block(block)
        blocks.append(block)

    pipeline.save()
    await pipeline.update(dict(
        blocks=[merge_dict(
            block.to_dict(include_content=True),
            extract(
                block_settings[idx] if block_settings and idx in block_settings else {},
                [
                    'content',
                ],
            ),
        ) for idx, block in enumerate(blocks)],
    ), update_content=True)

    if hasattr(test_case, 'pipelines_created_for_testing'):
        if not test_case.pipelines_created_for_testing:
            test_case.pipelines_created_for_testing = []
        test_case.pipelines_created_for_testing.append(pipeline)

    return pipeline, blocks
