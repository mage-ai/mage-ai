import json
import os
from typing import Callable, Dict, List

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.global_hooks.constants import (
    HookOutputKey,
    PredicateAndOrOperator,
    PredicateOperator,
    PredicateValueDataType,
)
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    Hook,
    HookCondition,
    HookOperation,
    HookOutputBlock,
    HookOutputSettings,
    HookStage,
    HookStrategy,
)
from mage_ai.data_preparation.models.global_hooks.predicates import (
    HookPredicate,
    PredicateValueType,
)
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import build_pipeline_with_blocks_and_content


def build_content(query: Dict) -> str:
    return f"""
if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_loader
def load_data(*args, **kwargs):
    return {json.dumps(query)}


@transformer
def transform(*args, **kwargs):
    return {json.dumps(query)}


@data_exporter
def export_data(*args, **kwargs):
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
    predicate_match: HookPredicate = None,
    predicate_match_after: HookPredicate = None,
    predicate_match_before: HookPredicate = None,
    predicate_miss: HookPredicate = None,
    snapshot: bool = True,
) -> List[Hook]:
    if not global_hooks:
        global_hooks = GlobalHooks.load_from_file()

    if matching_predicate_resource is None:
        matching_predicate_resource = dict(
            name=pipeline.name,
            type=pipeline.type,
        )

    if predicate_match is None and predicate_match_after is None and predicate_match_before is None:
        predicate_match = HookPredicate.load(
            and_or_operator=PredicateAndOrOperator.AND,
            predicates=[HookPredicate.load(
                left_value=v,
                left_value_type=PredicateValueType.load(
                    value_data_type=PredicateValueDataType.STRING,
                ),
                operator=PredicateOperator.EQUALS,
                right_value=v,
                right_value_type=PredicateValueType.load(
                        value_data_type=PredicateValueDataType.STRING,
                ),
            ) for v in matching_predicate_resource.values()],
        )

    if predicate_miss is None:
        predicate_miss = HookPredicate.load(
            and_or_operator=PredicateAndOrOperator.AND,
            predicates=[HookPredicate.load(
                left_value=v,
                left_value_type=PredicateValueType.load(
                    value_data_type=PredicateValueDataType.STRING,
                ),
                operator=PredicateOperator.EQUALS,
                right_value=None,
                right_value_type=PredicateValueType.load(
                        value_data_type=PredicateValueDataType.STRING,
                ),
            ) for v in matching_predicate_resource.values()],
        )

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

        predicate_use = predicate_match
        if predicate_match_after and HookStage.AFTER in hook_dict['stages']:
            predicate_use = predicate_match_after
        elif predicate_match_before and HookStage.BEFORE in hook_dict['stages']:
            predicate_use = predicate_match_before

        hook = Hook.load(
            operation_type=operation_type,
            predicate=predicate_use,
            resource_type=resource_type,
            strategies=[HookStrategy.RAISE],
            uuid=f'hook{idx}_{test_case.faker.unique.name()}',
            **hook_payload,
        )

        hook_miss = Hook.load(
            operation_type=hook.operation_type,
            resource_type=hook.resource_type,
            **hook.to_dict(),
        )
        hook_miss.uuid = test_case.faker.unique.name()
        hook_miss.predicate = predicate_miss

        if snapshot:
            hook.snapshot()
            hook_miss.snapshot()

        hooks.append(hook)
        hooks.append(hook_miss)
        hooks_match.append(hook)
        hooks_miss.append(hook_miss)

        global_hooks.add_hook(hook)
        global_hooks.add_hook(hook_miss)

    global_hooks.save()

    return global_hooks, hooks, hooks_match, hooks_miss


class GlobalHooksMixin(BaseApiTestCase):
    def setUp(self):
        self.pipelines_created_for_testing = []

    async def setUpAsync(
        self,
        block_settings: Dict = None,
        hook_settings: Callable = None,
        matching_predicate_resource: Dict = None,
        operation_type: HookOperation = None,
        pipeline_type: PipelineType = None,
        predicate_match: HookPredicate = None,
        predicate_match_after: HookPredicate = None,
        predicate_match_before: HookPredicate = None,
        predicate_miss: HookPredicate = None,
        resource_type: EntityName = None,
        snapshot: bool = True,
    ):
        block_settings_init = {
            0: dict(content=build_content({
                'type[]': [PipelineType.STREAMING.value],
            })),
            1: dict(content=build_content({
                'type[]': [PipelineType.INTEGRATION.value],
            })),
            2: dict(content=build_content(dict(powers=dict(fire=1)))),
            3: dict(content=build_content(dict(level=2))),
        }

        if block_settings:
            block_settings = merge_dict(block_settings_init, block_settings)
        else:
            block_settings = block_settings_init

        pipeline1, blocks1 = await build_pipeline_with_blocks_and_content(
            self,
            block_settings=block_settings,
            pipeline_type=pipeline_type or PipelineType.PYTHON,
        )
        pipeline2, blocks2 = await build_pipeline_with_blocks_and_content(
            self,
            block_settings=block_settings,
            pipeline_type=pipeline_type or PipelineType.PYTHON,
        )
        block11, block12, block13, block14 = blocks1
        block21, block22, block23, block24 = blocks2

        hook_settings_use = {
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
        }

        if hook_settings:
            hook_settings_use = merge_dict(hook_settings_use, hook_settings(dict(
                blocks1=blocks1,
                blocks2=blocks2,
                pipeline1=pipeline1,
                pipeline2=pipeline2,
            )))

        global_hooks, hooks, hooks_match, hooks_miss = build_hooks(
            self,
            hook_settings=hook_settings_use,
            matching_predicate_resource=matching_predicate_resource,
            operation_type=operation_type,
            pipeline=pipeline1,
            predicate_match=predicate_match,
            predicate_match_after=predicate_match_after,
            predicate_match_before=predicate_match_before,
            predicate_miss=predicate_miss,
            resource_type=resource_type,
            snapshot=snapshot,
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
