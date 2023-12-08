from unittest.mock import patch

from faker import Faker

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.models import (
    GlobalHooks,
    HookOperation,
    HookStage,
)
from mage_ai.data_preparation.models.global_hooks.pipelines import (
    attach_global_hook_execution,
)
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.shared.array import find
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks
from mage_ai.tests.shared.mixins import build_hooks


class BlockExecutorTest(BaseApiTestCase):
    def setUp(self):
        self.faker = Faker()

        self.pipeline1 = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
        )
        self.pipeline2 = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
        )

    def tearDown(self):
        PipelineRun.query.delete()
        PipelineSchedule.query.delete()

        self.pipeline1.delete()
        self.pipeline2.delete()

        super().tearDown()

    def test_attach_global_hook_execution_feature_disabled(self):
        value = self.faker.unique.name()

        with patch(
            'mage_ai.data_preparation.models.project.Project.is_feature_enabled',
            lambda _x, feature_uuid: False if FeatureUUID.GLOBAL_HOOKS == feature_uuid else True,
        ):
            self.assertEqual(attach_global_hook_execution(None, None, value), value)

    def test_attach_global_hook_execution(self):
        _global_hooks, _hooks, hooks_match, _hooks_miss = build_hooks(self, self.pipeline1)
        global_hooks = GlobalHooks()
        hook = hooks_match[0]

        for hook in hooks_match[1:]:
            hook.pipeline_settings = dict(uuid=self.pipeline1.uuid)

        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline2.uuid,
        )
        pipeline_run = PipelineRun.create(
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=self.pipeline2.uuid,
        )

        blocks = list(self.pipeline2.blocks_by_uuid.values())
        create_options = [(b.uuid, {}) for b in blocks]

        hook_variables = dict(
            operation_resource=pipeline_run.to_dict(),
            payload=dict(
                block_runs=create_options,
                pipeline_schedule=pipeline_run.pipeline_schedule.to_dict(),
            ),
            resource=self.pipeline2.to_dict(
                include_content=True,
                include_extensions=True,
                exclude_data_integration=True,
            ),
            resource_id=self.pipeline2.uuid,
        )

        with patch(
            'mage_ai.data_preparation.models.project.Project.is_feature_enabled',
            lambda _x, feature_uuid: FeatureUUID.GLOBAL_HOOKS == feature_uuid,
        ):
            with patch(
                'mage_ai.data_preparation.models.global_hooks.models.GlobalHooks.load_from_file',
                lambda: global_hooks,
            ):
                def __get_hooks(
                    operations,
                    entity_name,
                    stage,
                    cls=self,
                    create_options=create_options,
                    hook_variables=hook_variables,
                    pipeline_run=pipeline_run,
                    pipeline_schedule=pipeline_run.pipeline_schedule,
                    **kwargs,
                ):
                    self.assertEqual(operations, [HookOperation.EXECUTE])
                    self.assertEqual(entity_name, EntityName.Pipeline)
                    self.assertEqual(stage, HookStage.BEFORE)
                    self.assertEqual(kwargs, hook_variables)

                    return hooks_match

                with patch.object(global_hooks, 'get_hooks', __get_hooks):
                    arr = attach_global_hook_execution(
                        pipeline_run,
                        self.pipeline2,
                        create_options,
                    )

                    create_options0 = find(lambda tup: tup[0] == blocks[0].uuid, arr)
                    self.assertEqual(
                        create_options0[1]['metrics']['upstream_blocks'],
                        [m.uuid for m in hooks_match[1:]],
                    )

                    for block in blocks[1:]:
                        create_option = find(lambda tup, block=block: tup[0] == block.uuid, arr)
                        self.assertFalse('metrics' in create_option[1])

                    for hook in hooks_match[1:]:
                        create_option = find(lambda tup, hook=hook: tup[0] == hook.uuid, arr)
                        metrics = create_option[1]['metrics']
                        self.assertEqual(metrics['downstream_blocks'], [blocks[0].uuid])
                        self.assertEqual(metrics['hook'], hook.to_dict(include_all=True))
                        self.assertEqual(metrics['hook_variables'], hook_variables)
