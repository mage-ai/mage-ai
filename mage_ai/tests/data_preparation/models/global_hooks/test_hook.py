import uuid
from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.models import (
    Hook,
    HookCondition,
    HookOperation,
    HookRunSettings,
    HookStage,
    HookStatus,
    HookStrategy,
    run_hooks,
)
from mage_ai.orchestration.triggers.constants import TRIGGER_NAME_FOR_GLOBAL_HOOK
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.shared.mixins import GlobalHooksMixin


class HookTest(GlobalHooksMixin):
    async def test_pipeline(self):
        await self.setUpAsync()

        for hook in self.hooks_match[:3]:
            self.assertEqual(hook.pipeline.uuid, self.pipeline1.uuid)
        self.assertEqual(self.hooks_match[3].pipeline.uuid, self.pipeline2.uuid)

    async def test_should_run(self):
        await self.setUpAsync()

        operation_types = [HookOperation.DETAIL]
        resource_type = EntityName.Pipeline

        self.assertTrue(all([hook.should_run(
            conditions=[HookCondition.FAILURE],
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.BEFORE,
        ) for hook in self.hooks_miss[:2]]))

        for should_run_args in [
            dict(operation_types=[HookOperation.DELETE]),
            dict(resource_type=[EntityName.Tag]),
            dict(stage=HookStage.AFTER),
        ]:
            self.assertFalse(any([hook.should_run(**merge_dict(
                dict(
                    conditions=[HookCondition.FAILURE],
                    operation_types=operation_types,
                    resource_type=resource_type,
                    stage=HookStage.BEFORE,
                ),
                should_run_args,
            )) for hook in self.hooks_miss[:2]]))

        for should_run_args in [
            dict(conditions=[HookCondition.FAILURE]),
            dict(operation_types=[HookOperation.DELETE]),
            dict(resource_type=[EntityName.Tag]),
            dict(stage=HookStage.BEFORE),
        ]:
            self.assertFalse(any([hook.should_run(**merge_dict(
                dict(
                    conditions=[HookCondition.SUCCESS],
                    operation_types=operation_types,
                    resource_type=resource_type,
                    stage=HookStage.AFTER,
                ),
                should_run_args,
            )) for hook in self.hooks_miss[2:]]))

        self.assertTrue(all([hook.should_run(
            conditions=[HookCondition.SUCCESS],
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.AFTER,
        ) for hook in self.hooks_miss[2:]]))

        self.assertTrue(all([hook.should_run(
            conditions=[HookCondition.FAILURE],
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.BEFORE,
        ) for hook in self.hooks_match[:2]]))
        self.assertTrue(all([hook.should_run(
            conditions=[HookCondition.SUCCESS],
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.AFTER,
        ) for hook in self.hooks_match[2:]]))

    async def test_should_run_with_predicates(self):
        await self.setUpAsync()

        operation_resource = dict(
            name=self.pipeline1.name,
            type=self.pipeline1.type,
        )
        operation_types = [HookOperation.DETAIL]
        resource_type = EntityName.Pipeline

        self.assertFalse(any([hook.should_run(
            conditions=[HookCondition.FAILURE],
            operation_resource=operation_resource,
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.BEFORE,
        ) for hook in self.hooks_miss[:2]]))
        self.assertFalse(any([hook.should_run(
            conditions=[HookCondition.SUCCESS],
            operation_resource=operation_resource,
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.AFTER,
        ) for hook in self.hooks_miss[2:]]))

        self.assertTrue(all([hook.should_run(
            conditions=[HookCondition.FAILURE],
            operation_resource=operation_resource,
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.BEFORE,
        ) for hook in self.hooks_match[:2]]))
        self.assertTrue(all([hook.should_run(
            conditions=[HookCondition.SUCCESS],
            operation_resource=operation_resource,
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.AFTER,
        ) for hook in self.hooks_match[2:]]))

    async def test_run_no_pipeline(self):
        await self.setUpAsync()

        hook = self.hooks_match[0]
        with patch.object(hook.pipeline, 'execute_sync') as mock_execute_sync:
            hook._pipeline = None
            hook.pipeline_settings = None
            hook.run()
            mock_execute_sync.assert_not_called()

    async def test_run_with_strategy_raise_when_error(self):
        await self.setUpAsync()

        error = Exception(self.faker.unique.name())

        def _mock_execute_sync(error=error, *args, **kwargs):
            raise error

        hook = self.hooks_match[0]
        hook.strategies = [
            HookStrategy.BREAK,
            HookStrategy.CONTINUE,
            HookStrategy.RAISE,
        ]
        with patch.object(hook.pipeline, 'execute_sync', _mock_execute_sync):
            hook.run()
            self.assertEqual(hook.status.error, error)
            self.assertEqual(hook.status.strategy, HookStrategy.RAISE)

    async def test_run_with_strategy_continue_when_error(self):
        await self.setUpAsync()

        error = Exception(self.faker.unique.name())

        def _mock_execute_sync(error=error, *args, **kwargs):
            raise error

        hook = self.hooks_match[0]
        hook.strategies = [
            HookStrategy.CONTINUE,
        ]
        with patch.object(hook.pipeline, 'execute_sync', _mock_execute_sync):
            hook.run()
            self.assertEqual(hook.status.error, error)
            self.assertEqual(hook.status.strategy, HookStrategy.CONTINUE)

    async def test_run_with_strategy_break_when_error(self):
        await self.setUpAsync()

        error = Exception(self.faker.unique.name())

        def _mock_execute_sync(error=error, *args, **kwargs):
            raise error

        hook = self.hooks_match[0]
        hook.operation_type = HookOperation.EXECUTE
        hook.strategies = [
            HookStrategy.BREAK,
            HookStrategy.CONTINUE,
        ]
        with patch.object(hook.pipeline, 'execute_sync', _mock_execute_sync):
            hook.run()
            self.assertEqual(hook.status.error, error)
            self.assertEqual(hook.status.strategy, HookStrategy.BREAK)

    async def test_run_without_trigger(self):
        await self.setUpAsync()

        variables = dict(mage=self.faker.unique.name())
        hook = self.hooks_match[0]
        hook.pipeline_settings['variables'] = variables

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            resource=uuid.uuid4().hex,
            resources=uuid.uuid4().hex,
        )

        with patch.object(hook.pipeline, 'execute_sync') as mock_execute_sync:
            hook.run(**kwargs)
            mock_execute_sync.assert_called_once_with(
                global_vars=merge_dict(variables, kwargs),
                update_status=False,
            )

    @patch('mage_ai.data_preparation.models.global_hooks.models.trigger_pipeline')
    async def test_run_with_trigger(self, mock_trigger_pipeline):
        await self.setUpAsync()

        variables = dict(mage=self.faker.unique.name())
        hook = self.hooks_match[0]
        hook.pipeline_settings['variables'] = variables
        hook.run_settings = HookRunSettings.load(with_trigger=True)

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            resource=uuid.uuid4().hex,
            resources=uuid.uuid4().hex,
        )

        class PipelineRunFake(object):
            pass

        pipeline_run = PipelineRunFake()
        mock_trigger_pipeline.return_value = pipeline_run

        with patch.object(hook.pipeline, 'execute_sync') as mock_execute_sync:
            hook.run(**kwargs)

            mock_trigger_pipeline.assert_called_once_with(
                hook.pipeline.uuid,
                variables=merge_dict(variables, kwargs),
                check_status=True,
                error_on_failure=True,
                poll_interval=1,
                poll_timeout=None,
                schedule_name=TRIGGER_NAME_FOR_GLOBAL_HOOK,
                verbose=True,
            )
            mock_execute_sync.assert_not_called()

    async def test_run_hooks(self):
        await self.setUpAsync()

        hooks = self.hooks_match
        for hook in hooks:
            hook.output = dict(payload=dict(water=uuid.uuid4().hex))
            hook.status = HookStatus.load(error=None, strategy=HookStrategy.CONTINUE)

        kwargs = dict(fire=uuid.uuid4().hex)
        hook1, hook2, hook3, hook4 = hooks

        def _load(hooks=hooks, **hook_dict) -> Hook:
            mapping = {}

            for hook in hooks:
                mapping[hook.uuid] = hook

            return mapping[hook_dict['uuid']]

        class PipelineRunFake(object):
            pass

        pipeline_run = PipelineRunFake()

        with patch.object(Hook, 'load', _load):
            with patch.object(
                hook1,
                'run',
                return_value=pipeline_run,
            ) as mock_run_hook1:
                with patch.object(
                    hook2,
                    'run',
                    return_value=pipeline_run,
                ) as mock_run_hook2:
                    with patch.object(
                        hook3,
                        'run',
                        return_value=pipeline_run,
                    ) as mock_run_hook3:
                        with patch.object(
                            hook4,
                            'run',
                            return_value=pipeline_run,
                        ) as mock_run_hook4:
                            with patch.object(
                                hook1,
                                'get_and_set_output',
                            ) as mock_get_and_set_output_hook1:
                                with patch.object(
                                    hook2,
                                    'get_and_set_output',
                                ) as mock_get_and_set_output_hook2:
                                    with patch.object(
                                        hook3,
                                        'get_and_set_output',
                                    ) as mock_get_and_set_output_hook3:
                                        with patch.object(
                                            hook4,
                                            'get_and_set_output',
                                        ) as mock_get_and_set_output_hook4:
                                            arr = run_hooks([(hook.to_dict(
                                            ), kwargs) for hook in hooks])
                                            self.assertEqual(
                                                arr,
                                                [hook.to_dict(
                                                    include_run_data=True,
                                                ) for hook in hooks]
                                            )

                                            for mock_func in [
                                                mock_run_hook1,
                                                mock_run_hook2,
                                                mock_run_hook3,
                                                mock_run_hook4,
                                            ]:
                                                mock_func.assert_called_once_with(**kwargs)

                                            for mock_func in [
                                                mock_get_and_set_output_hook1,
                                                mock_get_and_set_output_hook2,
                                                mock_get_and_set_output_hook3,
                                                mock_get_and_set_output_hook4,
                                            ]:
                                                mock_func.assert_called_once_with(
                                                    pipeline_run=pipeline_run,
                                                )
