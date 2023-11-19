import json
import os
import uuid
from typing import Dict, List
from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType, PipelineType
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    Hook,
    HookCondition,
    HookOperation,
    HookPredicate,
    HookStage,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_repo_config

# from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


def build_update_metadata_content(query: Dict) -> str:
    return f"""
@data_loader
def load_data(*args, **kwargs):
    return {json.dumps(query)}
"""


def build_update_query_content(query: Dict) -> str:
    return f"""
@data_loader
def load_data(*args, **kwargs):
    return {json.dumps(query)}
"""


async def build_pipeline(
    test_case,
    block_settings: List[Dict] = None,
    name: str = None,
    pipeline_type: PipelineType = None,
) -> Pipeline:
    repo_path = test_case.repo_path

    pipeline = Pipeline.create(
        name or test_case.faker.unique.name(),
        repo_path=repo_path,
        pipeline_type=pipeline_type or PipelineType.PYTHON,
    )

    block1 = Block.create(
        test_case.faker.unique.name(),
        BlockType.DATA_LOADER,
        repo_path,
    )
    block2 = Block.create(
        test_case.faker.unique.name(),
        BlockType.DATA_LOADER,
        repo_path,
    )
    block3 = Block.create(
        test_case.faker.unique.name(),
        BlockType.DATA_LOADER,
        repo_path,
    )
    block4 = Block.create(
        test_case.faker.unique.name(),
        BlockType.DATA_LOADER,
        repo_path,
    )

    blocks = [
        block1,
        block2,
        block3,
        block4,
    ]

    for block in blocks:
        pipeline.add_block(block)

    pipeline.save()
    await pipeline.update(dict(
        blocks=[merge_dict(
            block.to_dict(include_content=True),
            (block_settings[idx] if block_settings else {}),
        ) for idx, block in enumerate(blocks)],
    ), update_content=True)

    return pipeline, [block1, block2, block3, block4]


def build_hooks(
    test_case,
    operation_type: HookOperation,
    hook_settings: List[Dict] = None,
    matching_predicate_resource: Dict = None,
    test_predicate_after: bool = False,
    test_predicate_before: bool = False,
) -> List[Hook]:
    if not matching_predicate_resource:
        matching_predicate_resource = dict(
            name=test_case.pipeline.name,
            type=test_case.pipeline.type,
        )

    predicates_match = [
        HookPredicate.load(resource=matching_predicate_resource),
    ]
    predicates_no_match = [
        HookPredicate.load(resource=dict(
            name=uuid.uuid4().hex,
            type=test_case.pipeline.type,
        )),
    ] + predicates_match

    global_hooks = GlobalHooks.load_from_file()

    hook1 = Hook.load(
        operation_type=operation_type,
        resource_type=EntityName.Pipeline,
        stages=[HookStage.BEFORE],
        uuid=f'hook1 {test_case.faker.unique.name()}',
        **(hook_settings[0]['settings'] if hook_settings else {}),
    )

    hook2 = Hook.load(
        operation_type=operation_type,
        resource_type=EntityName.Pipeline,
        stages=[HookStage.BEFORE],
        uuid=f'hook2 {test_case.faker.unique.name()}',
        **(hook_settings[1]['settings'] if hook_settings else {}),
    )

    hook3 = Hook.load(
        conditions=[HookCondition.SUCCESS],
        operation_type=operation_type,
        resource_type=EntityName.Pipeline,
        stages=[HookStage.AFTER],
        uuid=f'hook3 {test_case.faker.unique.name()}',
        **(hook_settings[2]['settings'] if hook_settings else {}),
    )

    hook4 = Hook.load(
        conditions=[HookCondition.SUCCESS],
        operation_type=operation_type,
        resource_type=EntityName.Pipeline,
        stages=[HookStage.AFTER],
        uuid=f'hook4 {test_case.faker.unique.name()}',
        **(hook_settings[3]['settings'] if hook_settings else {}),
    )

    if test_predicate_before:
        hook1.predicates = [
            predicates_match,
            predicates_no_match,
        ]
        hook2.predicates = [
            predicates_match,
            predicates_no_match,
        ]

        hook1_no_match = Hook.load(
            operation_type=hook1.operation_type,
            resource_type=hook1.resource_type,
            **hook1.to_dict(),
        )
        hook1_no_match.uuid = test_case.faker.unique.name()
        hook1_no_match.predicates = [
            predicates_no_match,
        ]
        global_hooks.add_hook(hook1_no_match)

    if test_predicate_after:
        hook3.predicates = [
            predicates_match,
            predicates_no_match,
        ]
        hook4.predicates = [
            predicates_match,
            predicates_no_match,
        ]

        hook3_no_match = Hook.load(
            operation_type=hook3.operation_type,
            resource_type=hook3.resource_type,
            **hook3.to_dict(),
        )
        hook3_no_match.uuid = test_case.faker.unique.name()
        hook3_no_match.predicates = [
            predicates_no_match,
        ]
        global_hooks.add_hook(hook3_no_match)

    hooks = [hook1, hook2, hook3, hook4]

    for idx, hook in enumerate(hooks):
        global_hooks.add_hook(hook)
        if hook_settings:
            hook._pipeline = hook_settings[idx]['pipeline']

    global_hooks.save()

    return global_hooks, hooks


async def run_test_for_operation(
    test_case,
    operation_type: HookOperation,
    build_operation,
    hook_settings: List[Dict] = None,
    matching_predicate_resource: Dict = None,
    test_predicate_after: bool = False,
    test_predicate_before: bool = False,
):
    operation = build_operation()

    global_hooks, hooks = build_hooks(
        test_case,
        operation_type,
        hook_settings=hook_settings,
        matching_predicate_resource=matching_predicate_resource,
        test_predicate_after=test_predicate_after,
        test_predicate_before=test_predicate_before,
    )

    with patch.object(GlobalHooks, 'load_from_file', lambda: global_hooks):
        response = await operation.execute()
        return response


class BaseOperationWithHooksTest(BaseApiTestCase):
    model_class = Pipeline

    @classmethod
    def setUpClass(self):
        super().setUpClass()

        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
            pipeline_type=PipelineType.STREAMING,
        )

        self.pipeline2 = create_pipeline_with_blocks(
            'test pipeline2',
            self.repo_path,
            pipeline_type=PipelineType.PYSPARK,
        )

        repo_config = get_repo_config()
        repo_config.save(features={
            FeatureUUID.GLOBAL_HOOKS.value: True,
        })

    def tearDown(self):
        file_path = GlobalHooks.file_path()
        if os.path.exists(file_path):
            os.remove(file_path)

    # async def test_list(self):
    #     block_settings = [
    #         dict(content=build_update_query_content({ 'type[]': [self.pipeline.type] })),
    #         dict(content=build_update_query_content({ 'type[]': [self.pipeline2.type] })),
    #         dict(content=build_update_metadata_content(dict(powers=dict(fire=1)))),
    #         dict(content=build_update_metadata_content(dict(water=2))),
    #     ]

    #     pipeline1, blocks1 = await build_pipeline(
    #         self,
    #         block_settings=block_settings,
    #     )
    #     pipeline2, blocks2 = await build_pipeline(
    #         self,
    #         block_settings=block_settings,
    #     )

    #     # response = await self.build_list_operation().execute()
    #     # pipelines = response['pipelines']
    #     # self.assertIsNotNone(find(lambda x: x['uuid'] == self.pipeline.uuid, pipelines))
    #     # self.assertIsNotNone(find(lambda x: x['uuid'] == self.pipeline2.uuid, pipelines))
    #     # self.assertIsNotNone(find(lambda x: x['uuid'] == pipeline1.uuid, pipelines))
    #     # self.assertIsNotNone(find(lambda x: x['uuid'] == pipeline2.uuid, pipelines))

    #     block11, block12, block13, block14 = blocks1
    #     block21, block22, block23, block24 = blocks2

    #     response = await run_test_for_operation(
    #         self,
    #         HookOperation.LIST,
    #         lambda: self.build_list_operation(),
    #         hook_settings=[
    #             dict(
    #                 pipeline=pipeline1,
    #                 settings=dict(
    #                     outputs=[
    #                         HookOutputSettings.load(
    #                             block=HookOutputBlock.load(uuid=block11.uuid),
    #                             key=HookOutputKey.QUERY,
    #                         ),
    #                         HookOutputSettings.load(
    #                             block=HookOutputBlock.load(uuid=block12.uuid),
    #                             key=HookOutputKey.QUERY,
    #                         ),
    #                     ],
    #                     pipeline=dict(
    #                         uuid=pipeline1.uuid,
    #                     ),
    #                 ),
    #             ),
    #             dict(
    #                 pipeline=pipeline1,
    #                 settings={},
    #             ),
    #             dict(
    #                 pipeline=pipeline1,
    #                 settings=dict(
    #                     outputs=[
    #                         HookOutputSettings.load(
    #                             block=HookOutputBlock.load(uuid=block13.uuid),
    #                             key=HookOutputKey.METADATA,
    #                         ),
    #                     ],
    #                     pipeline=dict(
    #                         uuid=pipeline1.uuid,
    #                     ),
    #                 ),
    #             ),
    #             dict(
    #                 pipeline=pipeline2,
    #                 settings=dict(
    #                     outputs=[
    #                         HookOutputSettings.load(
    #                             block=HookOutputBlock.load(uuid=block24.uuid),
    #                             key=HookOutputKey.METADATA,
    #                             keys=['water'],
    #                         ),
    #                     ],
    #                     pipeline=dict(
    #                         uuid=pipeline2.uuid,
    #                     ),
    #                 ),
    #             ),
    #         ],
    #     )

    #     response = await self.build_list_operation().execute()
    #     pipelines = response['pipelines']
    #     self.assertIsNotNone(find(lambda x: x['uuid'] == self.pipeline.uuid, pipelines))
    #     self.assertIsNotNone(find(lambda x: x['uuid'] == self.pipeline2.uuid, pipelines))
    #     self.assertIsNone(find(lambda x: x['uuid'] == pipeline1.uuid, pipelines))
    #     self.assertIsNone(find(lambda x: x['uuid'] == pipeline2.uuid, pipelines))

        # print(response)
    # async def test_list_with_predicates(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.LIST,
    #         lambda: self.build_list_operation(query={
    #             'type[]'
    #         }),
    #         test_predicate_after=True,
    #         matching_predicate_resource=dict(
    #             type=self.pipeline.type,
    #         ),
    #     )

    # async def test_create(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.CREATE,
    #         lambda: self.build_create_operation(dict(
    #             name=self.faker.unique.name(),
    #             type=self.pipeline.type,
    #         )),
    #     )

    # async def test_create_with_predicates(self):
    #     payload = dict(
    #         name=self.faker.unique.name(),
    #         type=self.pipeline.type,
    #     )

    #     await run_test_for_operation(
    #         self,
    #         HookOperation.CREATE,
    #         lambda: self.build_create_operation(payload),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #         matching_predicate_resource=payload,
    #     )

    # async def test_detail(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DETAIL,
    #         lambda: self.build_detail_operation(self.pipeline.uuid),
    #     )

    # async def test_detail_with_predicates(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DETAIL,
    #         lambda: self.build_detail_operation(self.pipeline.uuid),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #     )

    # async def test_update(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #     )

    # async def test_update_with_predicates(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #     )

    # async def test_update_anywhere(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE_ANYWHERE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #     )

    # async def test_update_anywhere_with_predicates(self):
    #     await run_test_for_operation(
    #         self,
    #         HookOperation.UPDATE_ANYWHERE,
    #         lambda: self.build_update_operation(self.pipeline.uuid, {}),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #     )

    # async def test_delete(self):
    #     pipeline = create_pipeline_with_blocks(
    #         self.faker.unique.name(),
    #         self.repo_path,
    #     )

    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DELETE,
    #         lambda: self.build_delete_operation(pipeline.uuid),
    #     )

    # async def test_delete_with_predicates(self):
    #     pipeline = create_pipeline_with_blocks(
    #         self.faker.unique.name(),
    #         self.repo_path,
    #         pipeline_type=self.pipeline.type,
    #     )

    #     await run_test_for_operation(
    #         self,
    #         HookOperation.DELETE,
    #         lambda: self.build_delete_operation(pipeline.uuid),
    #         test_predicate_after=True,
    #         test_predicate_before=True,
    #         matching_predicate_resource=dict(
    #             name=pipeline.name,
    #         ),
    #     )
