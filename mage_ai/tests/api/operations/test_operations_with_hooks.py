import os
from dataclasses import dataclass
from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    HookCondition,
    HookOperation,
    HookStage,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


@dataclass
class FakeGlobalHooks(GlobalHooks):
    pass


class FakeProject(Project):
    def is_feature_enabled(self, feature_name: FeatureUUID) -> str:
        return True


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
        global_hooks = GlobalHooks.load_from_file()
        # global_hooks.add_hook(Hook.load(
        #     operation_type=HookOperation.LIST,
        #     resource_type=EntityName.Pipeline,
        #     stages=[HookStage.BEFORE],
        #     uuid=self.faker.unique.name(),
        # ))

        with patch.object(GlobalHooks, 'load_from_file', lambda: global_hooks):
            with patch.object(global_hooks, 'get_and_run_hooks') as mock_get_and_run_hooks:
                response = await self.build_list_operation().execute()

                self.assertEqual(
                    dict(
                        conditions=None,
                        meta={},
                        operation_type=HookOperation.LIST,
                        payload={},
                        query={},
                        resource_type=EntityName.Pipeline,
                        stage=HookStage.BEFORE,
                    ),
                    mock_get_and_run_hooks.mock_calls[0][2],
                )

                self.assertEqual(
                    dict(
                        conditions=[HookCondition.SUCCESS],
                        error=None,
                        meta={},
                        metadata={},
                        operation_type=HookOperation.LIST,
                        query={},
                        resource=None,
                        resource_type=EntityName.Pipeline,
                        resources=response['pipelines'],
                        stage=HookStage.AFTER,
                    ),
                    mock_get_and_run_hooks.mock_calls[4][2],
                )
