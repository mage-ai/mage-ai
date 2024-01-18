import hashlib
import uuid
from datetime import datetime
from typing import List
from unittest.mock import patch

from freezegun import freeze_time

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.global_hooks.constants import (
    RESTRICTED_RESOURCE_TYPES,
    HookOutputKey,
)
from mage_ai.data_preparation.models.global_hooks.models import (
    Hook,
    HookCondition,
    HookOperation,
    HookOutputBlock,
    HookOutputSettings,
    HookRunSettings,
    HookStage,
    HookStatus,
    HookStrategy,
    run_hooks,
)
from mage_ai.data_preparation.models.global_hooks.predicates import HookPredicate
from mage_ai.orchestration.triggers.constants import TRIGGER_NAME_FOR_GLOBAL_HOOK
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.shared.mixins import GlobalHooksMixin


class HookTest(GlobalHooksMixin):
    async def test_pipeline(self):
        await self.setUpAsync()

        for hook in self.hooks_match[:3]:
            self.assertEqual(hook.pipeline.uuid, self.pipeline1.uuid)
        self.assertEqual(self.hooks_match[3].pipeline.uuid, self.pipeline2.uuid)

    @freeze_time(datetime(3000, 1, 1))
    async def test_should_run(self):
        await self.setUpAsync()

        for hook in self.hooks_match + self.hooks_miss:
            hook.snapshot()

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

    @freeze_time(datetime(3000, 1, 1))
    async def test_should_run_with_different_snapshot(self):
        await self.setUpAsync()

        operation_types = [HookOperation.DETAIL]
        resource_type = EntityName.Pipeline

        hook = self.hooks_match[0]
        hook.snapshot()

        self.assertTrue(hook.should_run(
            conditions=[HookCondition.FAILURE],
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.BEFORE,
        ))

        hook.metadata.snapshot_hash = uuid.uuid4().hex
        self.assertFalse(hook.should_run(
            conditions=[HookCondition.FAILURE],
            operation_types=operation_types,
            resource_type=resource_type,
            stage=HookStage.BEFORE,
        ))

    @freeze_time(datetime(3000, 1, 1))
    async def test_should_run_with_predicates(self):
        await self.setUpAsync()

        for hook in self.hooks_match + self.hooks_miss:
            hook.snapshot()

        hook = self.hooks_match[0]
        hook.predicate = HookPredicate.load()

        operation_resource = dict(
            name=self.pipeline1.name,
            type=self.pipeline1.type,
        )
        operation_types = [HookOperation.DETAIL]
        resource_type = EntityName.Pipeline

        with patch.object(hook.predicate, 'validate') as mock_validate:
            self.assertTrue(hook.should_run(
                conditions=[HookCondition.FAILURE],
                operation_resource=operation_resource,
                operation_types=operation_types,
                resource_parent=dict(fire=5),
                resource_parent_id=3,
                resource_parent_type=EntityName.User,
                resource_type=resource_type,
                stage=HookStage.BEFORE,
            ))

            mock_validate.assert_called_once_with(
                operation_resource,
                error=None,
                hook=hook.to_dict(include_all=True),
                meta=None,
                metadata=None,
                payload=None,
                query=None,
                resource=None,
                resource_id=None,
                resource_parent=dict(fire=5),
                resource_parent_id=3,
                resource_parent_type=EntityName.User,
                resources=None,
                user=None,
            )

    async def test_run_no_pipeline(self):
        await self.setUpAsync()

        hook = self.hooks_match[0]
        hook.snapshot()
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
        hook.snapshot()
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
        hook.snapshot()
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
        hook.snapshot()
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
        hook.snapshot()
        hook.pipeline_settings['variables'] = variables

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            payload=uuid.uuid4().hex,
            project=None,
            resource=uuid.uuid4().hex,
            resources=uuid.uuid4().hex,
        )

        with patch.object(hook.pipeline, 'execute_sync') as mock_execute_sync:
            hook.run(**kwargs)
            mock_execute_sync.assert_called_once_with(
                global_vars=merge_dict(variables, kwargs),
                update_status=False,
            )

    async def test_run_without_trigger_for_restricted_resource_type(self):
        await self.setUpAsync()

        variables = dict(mage=self.faker.unique.name())
        hook = self.hooks_match[0]
        hook.snapshot()
        hook.pipeline_settings['variables'] = variables
        hook.resource_type = RESTRICTED_RESOURCE_TYPES[-1]

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            payload=uuid.uuid4().hex,
            project=None,
            resource=uuid.uuid4().hex,
            resources=uuid.uuid4().hex,
        )

        with patch.object(hook.pipeline, 'execute_sync') as mock_execute_sync:
            hook.run(**kwargs)
            mock_execute_sync.assert_called_once_with(
                global_vars=merge_dict(variables, dict(hook=kwargs['hook'], project=None)),
                update_status=False,
            )

    @patch('mage_ai.data_preparation.models.global_hooks.models.trigger_pipeline')
    async def test_run_with_trigger(self, mock_trigger_pipeline):
        await self.setUpAsync()

        variables = dict(mage=self.faker.unique.name())
        hook = self.hooks_match[0]
        hook.snapshot()
        hook.pipeline_settings['variables'] = variables
        hook.run_settings = HookRunSettings.load(with_trigger=True)

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            payload=uuid.uuid4().hex,
            project=None,
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
                _should_schedule=False,
            )
            mock_execute_sync.assert_not_called()

    @patch('mage_ai.data_preparation.models.global_hooks.models.trigger_pipeline')
    async def test_run_with_trigger_asynchronously(self, mock_trigger_pipeline):
        await self.setUpAsync()

        variables = dict(mage=self.faker.unique.name())
        hook = self.hooks_match[0]
        hook.snapshot()
        hook.pipeline_settings['variables'] = variables
        hook.run_settings = HookRunSettings.load(
            asynchronous=True,
            with_trigger=True,
        )

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            payload=uuid.uuid4().hex,
            project=None,
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
                check_status=False,
                error_on_failure=True,
                poll_interval=1,
                poll_timeout=None,
                schedule_name=TRIGGER_NAME_FOR_GLOBAL_HOOK,
                verbose=True,
                _should_schedule=False,
            )
            mock_execute_sync.assert_not_called()

    @patch('mage_ai.data_preparation.models.global_hooks.models.trigger_pipeline')
    async def test_run_with_trigger_for_restricted_resource_type(self, mock_trigger_pipeline):
        await self.setUpAsync()

        variables = dict(mage=self.faker.unique.name())
        hook = self.hooks_match[0]
        hook.snapshot()
        hook.pipeline_settings['variables'] = variables
        hook.resource_type = RESTRICTED_RESOURCE_TYPES[0]
        hook.run_settings = HookRunSettings.load(with_trigger=True)

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            payload=uuid.uuid4().hex,
            project=None,
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
                variables=merge_dict(variables, dict(hook=kwargs['hook'], project=None)),
                check_status=True,
                error_on_failure=True,
                poll_interval=1,
                poll_timeout=None,
                schedule_name=TRIGGER_NAME_FOR_GLOBAL_HOOK,
                verbose=True,
                _should_schedule=False,
            )
            mock_execute_sync.assert_not_called()

    async def test_run_hooks(self):
        await self.setUpAsync()

        hooks = self.hooks_match
        for hook in hooks:
            hook.snapshot()
            hook.output = dict(payload=dict(water=uuid.uuid4().hex))
            hook.status = HookStatus.load(error=None, strategy=HookStrategy.CONTINUE)

        kwargs = dict(
            fire=uuid.uuid4().hex,
            resource_parent=dict(fire=5),
            resource_parent_id=3,
            resource_parent_type=EntityName.User,
        )

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
                                                    fire=kwargs['fire'],
                                                    resource_parent=dict(fire=5),
                                                    resource_parent_id=3,
                                                    resource_parent_type=EntityName.User,
                                                )

    async def test_get_and_set_output_with_no_pipeline_or_output_settings(self):
        await self.setUpAsync()

        hook = self.hooks_match[0]
        hook._pipeline = None
        hook.pipeline_settings = None
        hook.output_settings = None

        self.assertEqual({}, hook.get_and_set_output())
        self.assertEqual(hook.output, {})

    async def test_get_and_set_output_without_pipeline_run(self):
        await self.setUpAsync()

        hook, _hook2, hook3, hook4 = self.hooks_match

        variables = dict(mage=self.faker.unique.name())
        hook.pipeline_settings['variables'] = variables

        output_setting = hook4.output_settings[0]
        output_setting.block.uuid = self.blocks1[3].uuid

        hook.output_settings += hook3.output_settings + [
            output_setting,
            HookOutputSettings.load(
                block=HookOutputBlock.load(uuid=output_setting.block.uuid),
                key=HookOutputKey.METADATA,
                keys=['powers'],
            ),
        ]

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            resource=uuid.uuid4().hex,
            resources=uuid.uuid4().hex,
        )

        output = hook.get_and_set_output(hook.run(**kwargs))

        self.assertEqual(output, hook.output)
        self.assertEqual(output, dict(
            query={
                'type[]': [
                    'streaming',
                    'integration',
                ],
            },
            metadata=dict(
                powers=dict(
                    fire=1,
                    level=2,
                ),
                water=dict(
                    level=2,
                ),
            ),
        ))

    async def test_get_and_set_output_with_pipeline_run(self):
        await self.setUpAsync()

        hook, _hook2, hook3, hook4 = self.hooks_match

        variables = dict(mage=self.faker.unique.name())
        hook.pipeline_settings['variables'] = variables
        hook.run_settings = HookRunSettings.load(with_trigger=True)

        output_setting = hook4.output_settings[0]
        output_setting.block.uuid = self.blocks1[3].uuid

        hook.output_settings += hook3.output_settings + [
            output_setting,
            HookOutputSettings.load(
                block=HookOutputBlock.load(uuid=output_setting.block.uuid),
                key=HookOutputKey.METADATA,
                keys=['powers'],
            ),
        ]

        kwargs = dict(
            error=uuid.uuid4().hex,
            hook=hook.to_dict(include_all=True),
            meta=uuid.uuid4().hex,
            metadata=uuid.uuid4().hex,
            query=uuid.uuid4().hex,
            resource=uuid.uuid4().hex,
            resources=uuid.uuid4().hex,
        )

        pipeline_run = hook.run(
            check_status=False,
            error_on_failure=False,
            poll_timeout=10,
            should_schedule=False,
            **kwargs,
        )

        block1, block2, block3, block4 = self.blocks1

        def _build_get_outputs(
            block_run,
            block1=block1,
            block2=block2,
            block3=block3,
            block4=block4,
        ):
            mapping = {
                block1.uuid: {
                    'type[]': [PipelineType.STREAMING.value],
                },
                block2.uuid: {
                    'type[]': [PipelineType.PYSPARK.value],
                },
                block3.uuid: dict(powers=dict(fire=1)),
                block4.uuid: dict(level=2),
            }

            def _get_outputs(
                block_run=block_run,
                mapping=mapping,
                *args,
                **kwargs,
            ):
                return mapping[block_run.block_uuid]

            return _get_outputs

        br1, br2, br3, br4 = list(pipeline_run.block_runs)

        class PipelineRunFake(object):
            @property
            def block_runs(self) -> List:
                return [br1, br2, br3, br4]

        pipeline_run_mock = PipelineRunFake()

        with patch.object(br1, 'get_outputs', _build_get_outputs(br1)):
            with patch.object(br2, 'get_outputs', _build_get_outputs(br2)):
                with patch.object(br3, 'get_outputs', _build_get_outputs(br3)):
                    with patch.object(br4, 'get_outputs', _build_get_outputs(br4)):
                        output = hook.get_and_set_output(pipeline_run_mock)

                        self.assertEqual(output, hook.output)
                        self.assertEqual(output, dict(
                            query={
                                'type[]': [
                                    'streaming',
                                    'pyspark',
                                ],
                            },
                            metadata=dict(
                                powers=dict(
                                    fire=1,
                                    level=2,
                                ),
                                water=dict(
                                    level=2,
                                ),
                            ),
                        ))

    @freeze_time(datetime(3000, 1, 1))
    async def test_to_dict(self):
        await self.setUpAsync(snapshot=False)

        hook = self.hooks_match[0]
        hook.conditions = [HookCondition.SUCCESS]
        hook.pipeline_settings['variables'] = dict(mage=1)
        hook.project = dict(mage=1)
        hook.run_settings = HookRunSettings.load(asynchronous=True, with_trigger=True)
        hook.strategies = [HookStrategy.BREAK]

        self.assertEqual(
            hook.to_dict(convert_enum=True, ignore_empty=True, include_project=True),
            dict(
                conditions=[m.value for m in hook.conditions],
                metadata=dict(
                    created_at=datetime.utcnow().isoformat(' ', 'seconds'),
                    updated_at=datetime.utcnow().isoformat(' ', 'seconds'),
                ),
                outputs=[m.to_dict() for m in hook.output_settings],
                pipeline=dict(
                    uuid=self.pipeline1.uuid,
                    variables=dict(mage=1),
                ),
                predicate=hook.predicate.to_dict(convert_enum=True, ignore_empty=True),
                project=dict(mage=1),
                run_settings=dict(asynchronous=True, with_trigger=True),
                stages=[m.value for m in hook.stages],
                strategies=[m.value for m in hook.strategies],
                uuid=hook.uuid,
            ),
        )

    @freeze_time(datetime(3000, 1, 1))
    async def test_to_dict_include_all(self):
        await self.setUpAsync(snapshot=False)

        hook = self.hooks_match[0]
        hook.conditions = [HookCondition.SUCCESS]
        hook.pipeline_settings['variables'] = dict(mage=1)
        hook.run_settings = HookRunSettings.load(asynchronous=True, with_trigger=True)
        hook.strategies = [HookStrategy.BREAK]

        self.assertEqual(
            hook.to_dict(convert_enum=True, ignore_empty=True, include_all=True),
            dict(
                conditions=[m.value for m in hook.conditions],
                metadata=dict(
                    created_at=datetime.utcnow().isoformat(' ', 'seconds'),
                    updated_at=datetime.utcnow().isoformat(' ', 'seconds'),
                ),
                operation_type=hook.operation_type.value,
                outputs=[m.to_dict() for m in hook.output_settings],
                pipeline=dict(
                    uuid=self.pipeline1.uuid,
                    variables=dict(mage=1),
                ),
                predicate=hook.predicate.to_dict(convert_enum=True, ignore_empty=True),
                resource_type=hook.resource_type.value,
                run_settings=dict(asynchronous=True, with_trigger=True),
                stages=[m.value for m in hook.stages],
                strategies=[m.value for m in hook.strategies],
                uuid=hook.uuid,
            ),
        )

    @freeze_time(datetime(3000, 1, 1))
    async def test_to_dict_include_run_data(self):
        await self.setUpAsync(snapshot=False)

        hook = self.hooks_match[0]
        hook.conditions = [HookCondition.SUCCESS]
        hook.output = dict(fire=2)
        hook.pipeline_settings['variables'] = dict(mage=1)
        hook.run_settings = HookRunSettings.load(asynchronous=True, with_trigger=True)
        hook.status = HookStatus.load(error=500, strategy=HookStrategy.BREAK)
        hook.strategies = [HookStrategy.BREAK]

        self.assertEqual(
            hook.to_dict(convert_enum=True, ignore_empty=True, include_run_data=True),
            dict(
                conditions=[m.value for m in hook.conditions],
                metadata=dict(
                    created_at=datetime.utcnow().isoformat(' ', 'seconds'),
                    updated_at=datetime.utcnow().isoformat(' ', 'seconds'),
                ),
                output=dict(fire=2),
                outputs=[m.to_dict() for m in hook.output_settings],
                pipeline=dict(
                    uuid=self.pipeline1.uuid,
                    variables=dict(mage=1),
                ),
                predicate=hook.predicate.to_dict(convert_enum=True, ignore_empty=True),
                run_settings=dict(asynchronous=True, with_trigger=True),
                stages=[m.value for m in hook.stages],
                status=dict(error=500, strategy=HookStrategy.BREAK.value),
                strategies=[m.value for m in hook.strategies],
                uuid=hook.uuid,
            ),
        )

    @freeze_time(datetime(3000, 1, 1))
    async def test_snapshot(self):
        await self.setUpAsync()

        hook = self.hooks_match[0]
        hook.snapshot()

        now = datetime.utcnow().isoformat(' ', 'seconds')
        hashes = []

        for block in self.pipeline1.blocks_by_uuid.values():
            hashes.append(
                hashlib.md5(f'{now}{block.content}'.encode()).hexdigest()
            )

        hashes_combined = ''.join(hashes)
        snapshot_hash = hashlib.md5(
            f'{now}{hashes_combined}'.encode(),
        ).hexdigest()

        self.assertEqual(now, hook.metadata.snapshotted_at)
        self.assertEqual(snapshot_hash, hook.metadata.snapshot_hash)


# class HookProjectPlatformTest(ProjectPlatformMixin, GlobalHooksMixin):
#     async def test_pipeline(self):
#         await self.setUpAsync()

#         for hook in self.hooks_match[:3]:
#             for project in self.repo_paths.values():
#                 pipeline = create_pipeline_with_blocks(
#                     self.faker.unique.name(),
#                     project['full_path'],
#                 )
#                 pipeline.save()

#                 hook._pipeline = None
#                 hook.pipeline_settings = dict(uuid=pipeline.uuid)
#                 self.assertIsNone(hook.pipeline)

#                 hook._pipeline = None
#                 hook.project = project
#                 self.assertEqual(hook.pipeline.uuid, pipeline.uuid)
