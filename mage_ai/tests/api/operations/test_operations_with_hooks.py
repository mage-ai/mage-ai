import os
from typing import List
from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    Hook,
    HookCondition,
    HookOperation,
    HookStage,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


def build_hooks(test_case, operation_type: HookOperation) -> List[Hook]:
    global_hooks = GlobalHooks.load_from_file()
    hook1 = Hook.load(
        operation_type=operation_type,
        resource_type=EntityName.Pipeline,
        stages=[HookStage.BEFORE],
        uuid=test_case.faker.unique.name(),
    )
    global_hooks.add_hook(hook1)
    hook2 = Hook.load(
        conditions=[HookCondition.SUCCESS],
        operation_type=operation_type,
        resource_type=EntityName.Pipeline,
        stages=[HookStage.AFTER],
        uuid=test_case.faker.unique.name(),
    )
    global_hooks.add_hook(hook2)
    global_hooks.save()

    return global_hooks, [hook1, hook2]


async def run_test_for_operation(test_case, operation_type: HookOperation, build_operation):
    global_hooks, hooks = build_hooks(test_case, operation_type)

    response = await test_case.build_list_operation().execute()
    test_case.assertIsNone(response.get('error'))

    with patch.object(GlobalHooks, 'load_from_file', lambda: global_hooks):
        with patch.object(global_hooks, 'run_hooks') as mock_run_hooks:
            response = await build_operation().execute()

            test_case.assertEqual(
                [
                    hooks[0].to_dict(),
                ],
                [m.to_dict() for m in mock_run_hooks.mock_calls[0][1][0]],
            )

            test_case.assertEqual(
                [
                    hooks[1].to_dict(),
                ],
                [m.to_dict() for m in mock_run_hooks.mock_calls[4][1][0]],
            )


class BaseOperationWithHooksTest(BaseApiTestCase):
    model_class = Pipeline

    @classmethod
    def setUpClass(self):
        super().setUpClass()

        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )
        repo_config = get_repo_config()
        repo_config.save(features={
            FeatureUUID.GLOBAL_HOOKS.value: True,
        })

    def tearDown(self):
        file_path = GlobalHooks.file_path()
        if os.path.exists(file_path):
            os.remove(file_path)

    async def test_list(self):
        await run_test_for_operation(
            self,
            HookOperation.LIST,
            lambda: self.build_list_operation(),
        )

    async def test_create(self):
        await run_test_for_operation(
            self,
            HookOperation.CREATE,
            lambda: self.build_create_operation(dict(name=self.faker.unique.name())),
        )

    async def test_detail(self):
        await run_test_for_operation(
            self,
            HookOperation.DETAIL,
            lambda: self.build_detail_operation(self.pipeline.uuid),
        )

    async def test_update(self):
        await run_test_for_operation(
            self,
            HookOperation.UPDATE,
            lambda: self.build_update_operation(self.pipeline.uuid, {}),
        )

    async def test_delete(self):
        pipeline = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
        )
        await run_test_for_operation(
            self,
            HookOperation.DELETE,
            lambda: self.build_delete_operation(pipeline.uuid),
        )
