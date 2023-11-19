import json
import os
import uuid
from typing import Dict, List

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    Hook,
    HookCondition,
    HookOperation,
    HookOutputBlock,
    HookOutputKey,
    HookOutputSettings,
    HookPredicate,
    HookStage,
)
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import build_pipeline_with_blocks_and_content


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


def build_hooks(
    test_case,
    pipeline: PipelineType,
    global_hooks: GlobalHooks = None,
    hook_settings: Dict = None,
    matching_predicate_resource: Dict = None,
    operation_type: HookOperation = None,
    resource_type: EntityName = None,
    test_predicate_after: bool = False,
    test_predicate_before: bool = False,
    predicates_match: List[HookPredicate] = None,
    predicates_miss: List[HookPredicate] = None,
) -> List[Hook]:
    if not global_hooks:
        global_hooks = GlobalHooks.load_from_file()

    if not matching_predicate_resource:
        matching_predicate_resource = dict(
            name=pipeline.name,
            type=pipeline.type,
        )

    if not predicates_match:
        predicates_match = [
            HookPredicate.load(resource=matching_predicate_resource),
        ]

    if not predicates_miss:
        predicates_miss = [
            HookPredicate.load(resource=dict(
                name=uuid.uuid4().hex,
                type=pipeline.type,
            )),
        ] + predicates_match

    if not operation_type:
        operation_type = HookOperation.DETAIL

    if not resource_type:
        resource_type = EntityName.Pipeline

    hooks = []
    hooks_match = []
    hooks_miss = []
    for idx, hook_dict in enumerate([
        dict(
            stages=[HookStage.BEFORE],
        ),
        dict(
            conditions=[HookCondition.FAILURE],
            stages=[HookStage.BEFORE],
        ),
        dict(
            conditions=[HookCondition.SUCCESS],
            stages=[HookStage.AFTER],
        ),
        dict(
            conditions=[HookCondition.SUCCESS],
            stages=[HookStage.AFTER],
        ),
    ]):
        hook_payload = hook_dict.copy()
        if hook_settings and idx in hook_settings:
            hook_setting = hook_settings[idx]
            hook_payload.update(hook_setting)

        hook = Hook.load(
            operation_type=operation_type,
            predicates=[
                predicates_match,
                predicates_miss,
            ],
            resource_type=resource_type,
            uuid=f'hook{idx}_{test_case.faker.unique.name()}',
            **hook_payload,
        )

        hook_miss = Hook.load(
            operation_type=hook.operation_type,
            resource_type=hook.resource_type,
            **hook.to_dict(),
        )
        hook_miss.uuid = test_case.faker.unique.name()
        hook_miss.predicates = [
            predicates_miss,
        ]

        hooks.append(hook)
        hooks.append(hook_miss)
        hooks_match.append(hook)
        hooks_miss.append(hook_miss)

        global_hooks.add_hook(hook)
        global_hooks.add_hook(hook_miss)

    global_hooks.save()

    return global_hooks, hooks, hooks_match, hooks_miss


class GlobalHooksMixin(BaseApiTestCase):
    async def setUpAsync(self):
        block_settings = {
            0: dict(content=build_update_query_content({
                'type[]': [PipelineType.STREAMING.value],
            })),
            1: dict(content=build_update_query_content({
                'type[]': [PipelineType.PYSPARK.value],
            })),
            2: dict(content=build_update_metadata_content(dict(powers=dict(fire=1)))),
            3: dict(content=build_update_metadata_content(dict(level=2))),
        }

        pipeline1, blocks1 = await build_pipeline_with_blocks_and_content(
            self,
            block_settings=block_settings,
            pipeline_type=PipelineType.PYTHON,
        )
        pipeline2, blocks2 = await build_pipeline_with_blocks_and_content(
            self,
            block_settings=block_settings,
            pipeline_type=PipelineType.PYTHON,
        )
        block11, block12, block13, block14 = blocks1
        block21, block22, block23, block24 = blocks2

        global_hooks, hooks, hooks_match, hooks_miss = build_hooks(
            self,
            hook_settings={
                0: dict(
                    outputs=[
                        HookOutputSettings.load(
                            block=HookOutputBlock.load(uuid=block11.uuid),
                            key=HookOutputKey.QUERY,
                        ),
                        HookOutputSettings.load(
                            block=HookOutputBlock.load(uuid=block12.uuid),
                            key=HookOutputKey.QUERY,
                        ),
                    ],
                    pipeline=dict(
                        uuid=pipeline1.uuid,
                    ),
                ),
                1: dict(
                    pipeline=dict(
                        uuid=pipeline1.uuid,
                    ),
                ),
                2: dict(
                    outputs=[
                        HookOutputSettings.load(
                            block=HookOutputBlock.load(uuid=block13.uuid),
                            key=HookOutputKey.METADATA,
                        ),
                    ],
                    pipeline=dict(
                        uuid=pipeline1.uuid,
                    ),
                ),
                3: dict(
                    outputs=[
                        HookOutputSettings.load(
                            block=HookOutputBlock.load(uuid=block24.uuid),
                            key=HookOutputKey.METADATA,
                            keys=['water'],
                        ),
                    ],
                    pipeline=dict(
                        uuid=pipeline2.uuid,
                    ),
                ),
            },
            pipeline=pipeline1,
        )

        self.blocks1 = blocks1
        self.blocks2 = blocks2
        self.global_hooks = global_hooks
        self.hooks = hooks
        self.hooks_match = hooks_match
        self.hooks_miss = hooks_miss
        self.pipeline1 = pipeline1
        self.pipeline2 = pipeline2

    def tearDown(self):
        file_path = GlobalHooks.file_path()
        if os.path.exists(file_path):
            os.remove(file_path)

        self.pipeline1.delete()
        self.pipeline2.delete()

        super().tearDown()

    def bootstrap(self):
        pass

    def cleanup(self):
        pass
