import os
from typing import Dict, List
from unittest.mock import patch

import yaml

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.constants import (
    DISABLED_RESOURCE_TYPES,
)
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    Hook,
    HookCondition,
    HookOperation,
    HookPredicate,
    HookRunSettings,
    HookStage,
    HookStrategy,
)
from mage_ai.shared.array import find
from mage_ai.shared.io import safe_write
from mage_ai.tests.api.operations.test_base import BaseApiTestCase

SEED_DATA_HOOK_UUID = 'laser'


def build_seed_data(test_case: BaseApiTestCase) -> Dict:
    return dict(
        resources={
            EntityName.Block.value: {
                HookOperation.LIST.value: [
                    dict(
                        uuid=SEED_DATA_HOOK_UUID,
                    ),
                ],
            },
        },
    )


def build_hook(
    test_case: BaseApiTestCase,
    conditions: List[HookCondition] = None,
    operation_type: HookOperation = None,
    output: Dict = None,
    pipeline: Dict = None,
    predicates: List[List[HookPredicate]] = None,
    resource_type: EntityName = None,
    run_settings: HookRunSettings = None,
    stages: List[HookStage] = None,
    strategies: List[HookStrategy] = None,
    uuid: str = None,
) -> Hook:
    return Hook.load(
        conditions=conditions,
        operation_type=operation_type or HookOperation.DETAIL,
        output=output,
        pipeline=pipeline,
        predicates=predicates,
        resource_type=resource_type or EntityName.Pipeline,
        run_settings=run_settings,
        stages=stages or [HookStage.BEFORE],
        strategies=strategies,
        uuid=uuid or test_case.faker.unique.name(),
    )


def build_and_add_hooks(test_case, global_hooks: GlobalHooks) -> List[Hook]:
    hook1 = build_hook(test_case, resource_type=EntityName.Chart)
    hook2 = build_hook(test_case, operation_type=HookOperation.DELETE, resource_type=EntityName.Tag)
    hook3 = build_hook(
        test_case,
        operation_type=HookOperation.DELETE,
        resource_type=EntityName.Chart,
    )
    hooks = [hook1, hook2, hook3]
    for hook in hooks:
        global_hooks.add_hook(hook)

    return hooks


class GlobalHooksTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()

        file_path = GlobalHooks.file_path()
        content = yaml.safe_dump(build_seed_data(self))
        safe_write(file_path, content)

        self.global_hooks = GlobalHooks.load_from_file()

    def tearDown(self):
        file_path = GlobalHooks.file_path()
        if os.path.exists(file_path):
            os.remove(file_path)

    def test_load_from_file(self):
        global_hooks = GlobalHooks.load_from_file()
        self.assertEqual(global_hooks.to_dict(), build_seed_data(self))

    def test_add_hook(self):
        hook = build_hook(self)
        self.global_hooks.add_hook(hook)

        data = build_seed_data(self)
        data['resources'][hook.resource_type.value] = {
            hook.operation_type.value: [
                hook.to_dict(),
            ],
        }

        self.assertEqual(data, self.global_hooks.to_dict())

    def test_add_hook_update_in_place(self):
        hook = build_hook(self)
        self.global_hooks.add_hook(hook)

        data = build_seed_data(self)

        hook_dict_init = hook.to_dict()
        data['resources'][hook.resource_type.value] = {
            hook.operation_type.value: [
                hook_dict_init,
            ],
        }

        self.assertEqual(data, self.global_hooks.to_dict())

        uuid_new = self.faker.unique.name()
        hook.uuid = uuid_new
        self.global_hooks.add_hook(hook, dict(uuid=uuid_new), update=True)

        data['resources'][hook.resource_type.value][hook.operation_type.value][0]['uuid'] = uuid_new
        self.assertEqual(data, self.global_hooks.to_dict())

    def test_add_hook_update_new_resource_type(self):
        resource_type_init = EntityName.Chart
        hook = build_hook(self, operation_type=HookOperation.LIST, resource_type=resource_type_init)
        self.global_hooks.add_hook(hook)

        self.assertTrue(resource_type_init.value in self.global_hooks.to_dict()['resources'])

        resource_type = EntityName.Block
        uuid_new = self.faker.unique.name()
        hook.uuid = uuid_new
        self.global_hooks.add_hook(hook, dict(
            resource_type=resource_type,
            uuid=uuid_new,
        ), update=True)

        data = self.global_hooks.to_dict()

        self.assertTrue(resource_type_init.value not in data['resources'])
        self.assertEqual(
            data['resources'][resource_type.value][hook.operation_type.value][1]['uuid'],
            uuid_new,
        )
        self.assertEqual(
            len(data['resources'][resource_type.value][hook.operation_type.value]),
            2,
        )

    def test_add_hook_update_new_operation_type(self):
        operation_type_init = HookOperation.UPDATE_ANYWHERE
        hook = build_hook(self, operation_type=operation_type_init, resource_type=EntityName.Tag)
        self.global_hooks.add_hook(hook)

        self.assertTrue(
            operation_type_init.value in self.global_hooks.to_dict(
            )['resources'][EntityName.Tag.value]),

        operation_type = HookOperation.LIST
        uuid_new = self.faker.unique.name()
        hook.uuid = uuid_new
        self.global_hooks.add_hook(hook, dict(
            operation_type=operation_type,
            uuid=uuid_new,
        ), update=True)

        data = self.global_hooks.to_dict()

        self.assertTrue(operation_type_init.value not in data['resources'])
        self.assertEqual(
            data['resources'][EntityName.Tag.value][HookOperation.LIST.value][0]['uuid'],
            uuid_new,
        )

    def test_add_hook_already_exists(self):
        hook = build_hook(self)
        self.global_hooks.add_hook(hook)
        error = False
        try:
            self.global_hooks.add_hook(hook)
        except Exception:
            error = True
        self.assertTrue(error)

    def test_add_hook_update_doesnt_exist(self):
        hook = build_hook(self)
        error = False
        try:
            self.global_hooks.add_hook(hook, {}, update=True)
        except Exception:
            error = True
        self.assertTrue(error)

    def test_add_hook_for_disabled_resource_types(self):
        for resource_type in DISABLED_RESOURCE_TYPES:
            hook = build_hook(self, resource_type=resource_type)
            error = False
            try:
                self.global_hooks.add_hook(hook)
            except Exception:
                error = True
            self.assertTrue(error)

    def test_remove_hook(self):
        hook = build_hook(
            self,
            operation_type=HookOperation.LIST,
            resource_type=EntityName.Tag,
        )
        self.global_hooks.add_hook(hook)
        data = self.global_hooks.to_dict()

        self.assertEqual(
            data['resources'][EntityName.Tag.value][HookOperation.LIST.value][0]['uuid'],
            hook.uuid,
        )

        self.global_hooks.remove_hook(hook)
        data = self.global_hooks.to_dict()
        self.assertTrue(EntityName.Tag.value not in data['resources'])

    def test_hooks(self):
        hooks_new = build_and_add_hooks(self, self.global_hooks)
        hooks = self.global_hooks.hooks()

        self.assertEqual(len(hooks), 4)

        for hook_uuid in [SEED_DATA_HOOK_UUID] + [hook.uuid for hook in hooks_new]:
            self.assertIsNotNone(find(
                lambda x: x.uuid == hook_uuid,
                hooks,
            ))

    def test_hooks_with_filters(self):
        hook1, hook2, hook3 = build_and_add_hooks(self, self.global_hooks)

        hooks = self.global_hooks.hooks(
            operation_types=[HookOperation.DELETE],
        )
        self.assertEqual(len(hooks), 2)
        for hook in [hook2, hook3]:
            self.assertIsNotNone(find(
                lambda x: x.uuid == hook.uuid,
                hooks,
            ))

        hooks = self.global_hooks.hooks(
            resource_types=[EntityName.Chart],
        )
        self.assertEqual(len(hooks), 2)
        for hook in [hook1, hook3]:
            self.assertIsNotNone(find(
                lambda x: x.uuid == hook.uuid,
                hooks,
            ))

        hooks = self.global_hooks.hooks(
            operation_types=[HookOperation.DELETE],
            resource_types=[EntityName.Tag],
        )
        self.assertEqual(len(hooks), 1)
        for hook in [hook2]:
            self.assertIsNotNone(find(
                lambda x: x.uuid == hook.uuid,
                hooks,
            ))

    def test_get_hook(self):
        for hook in build_and_add_hooks(self, self.global_hooks):
            self.assertEqual(hook, self.global_hooks.get_hook(
                resource_type=hook.resource_type,
                operation_type=hook.operation_type,
                uuid=hook.uuid,
            ))

    def test_get_hooks(self):
        hook1, hook2, hook3 = build_and_add_hooks(self, self.global_hooks)

        hooks = self.global_hooks.get_hooks(
            operation_types=[
                HookOperation.DETAIL,
                HookOperation.DELETE,
            ],
            resource_type=EntityName.Chart,
            stage=HookStage.BEFORE,
        )

        self.assertEqual(len(hooks), 2)
        for hook in [hook1, hook3]:
            self.assertIsNotNone(find(
                lambda x: x.uuid == hook.uuid,
                hooks,
            ))

    @patch('mage_ai.data_preparation.models.global_hooks.models.run_hooks')
    def test_run_hooks(self, mock_run_hooks):
        hook1, hook2, hook3 = build_and_add_hooks(self, self.global_hooks)
        hook4 = build_hook(self)
        self.global_hooks.add_hook(hook4)

        hook1.pipeline_settings = dict(uuid='fire')
        hook2.pipeline_settings = dict(uuid='fire')
        hook3.pipeline_settings = dict(uuid='water')
        extra_args = dict(
            earth=1,
            wind=2,
        )

        self.global_hooks.run_hooks([
            hook1,
            hook2,
            hook3,
            hook4,
        ], **extra_args)

        self.assertEqual(mock_run_hooks.call_count, 2)

        self.assertEqual(
            mock_run_hooks.mock_calls[0][1][0],
            [
                (
                    hook1.to_dict(
                        include_all=True,
                        include_output=True,
                    ),
                    extra_args,
                ),
                (
                    hook2.to_dict(
                        include_all=True,
                        include_output=True,
                    ),
                    extra_args,
                ),
            ],
        )
        self.assertEqual(
            mock_run_hooks.mock_calls[1][1][0],
            [
                (
                    hook3.to_dict(
                        include_all=True,
                        include_output=True,
                    ),
                    extra_args,
                ),
            ],
        )

    def test_get_and_run_hooks(self):
        hooks = build_and_add_hooks(self, self.global_hooks)

        with patch.object(self.global_hooks, 'get_hooks') as mock_get_hooks:
            mock_get_hooks.return_value = hooks

            with patch.object(self.global_hooks, 'run_hooks') as mock_run_hooks:
                options = dict(
                    operation_types=[HookOperation.LIST, HookOperation.CREATE],
                    resource_type=EntityName.Tag,
                    stage=HookStage.BEFORE,
                    conditions=[HookCondition.SUCCESS, HookCondition.FAILURE],
                    operation_resource=dict(mage=1),
                )

                self.global_hooks.get_and_run_hooks(
                    fire=2,
                    water=3,
                    **options,
                )

                mock_get_hooks.assert_called_once_with(**options)
                mock_run_hooks.assert_called_once_with(
                    hooks,
                    fire=2,
                    water=3,
                )

    def test_save(self):
        hook = build_hook(self)

        global_hooks = GlobalHooks.load(
            resources={
                EntityName.Tag.value: {
                    HookOperation.UPDATE_ANYWHERE.value: [
                        hook.to_dict(),
                    ],
                },
            },
        )

        global_hooks.save()

        with open(global_hooks.file_path()) as f:
            data = yaml.safe_load(f.read())

            self.assertEqual(
                data['resources'][EntityName.Tag.value][HookOperation.UPDATE_ANYWHERE.value],
                [
                    hook.to_dict(),
                ],
            )

    def test_to_dict(self):
        hook1, hook2, hook3 = build_and_add_hooks(self, self.global_hooks)
        hook4 = build_hook(self)
        self.global_hooks.add_hook(hook4)

        self.assertEqual(
            self.global_hooks.to_dict(),
            dict(
                resources={
                    EntityName.Block.value: {
                        HookOperation.LIST.value: [
                            dict(
                                uuid=SEED_DATA_HOOK_UUID,
                            ),
                        ],
                    },
                    EntityName.Chart.value: {
                        HookOperation.DELETE.value: [
                            hook3.to_dict(),
                        ],
                        HookOperation.DETAIL.value: [
                            hook1.to_dict(),
                        ],
                    },
                    EntityName.Pipeline.value: {
                        HookOperation.DETAIL.value: [
                            hook4.to_dict(),
                        ],
                    },
                    EntityName.Tag.value: {
                        HookOperation.DELETE.value: [
                            hook2.to_dict(),
                        ],
                    },
                },
            ),
        )
