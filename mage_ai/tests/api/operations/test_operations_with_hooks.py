import os
import uuid
from typing import Dict, List
from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.constants import PipelineType
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
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


def build_hooks(
    test_case,
    operation_type: HookOperation,
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
        uuid=f'match1 {test_case.faker.unique.name()}',
    )

    if test_predicate_before:
        hook1.predicates = [
            predicates_match,
            predicates_no_match,
        ]

        hook1_no_match = Hook.load(
            operation_type=hook1.operation_type,
            resource_type=hook1.resource_type,
            **hook1.to_dict(),
        )
        hook1_no_match.uuid = f'no match {test_case.faker.unique.name()}'
        hook1_no_match.predicates = [
            predicates_no_match,
        ]
        global_hooks.add_hook(hook1_no_match)

    global_hooks.add_hook(hook1)

    hook2 = Hook.load(
        conditions=[HookCondition.SUCCESS],
        operation_type=operation_type,
        resource_type=EntityName.Pipeline,
        stages=[HookStage.AFTER],
        uuid=f'match2 {test_case.faker.unique.name()}',
    )

    if test_predicate_after:
        hook2.predicates = [
            predicates_match,
            predicates_no_match,
        ]

        hook2_no_match = Hook.load(
            operation_type=hook2.operation_type,
            resource_type=hook2.resource_type,
            **hook2.to_dict(),
        )
        hook2_no_match.uuid = f'no match {test_case.faker.unique.name()}'
        hook2_no_match.predicates = [
            predicates_no_match,
        ]
        global_hooks.add_hook(hook2_no_match)

    global_hooks.add_hook(hook2)
    global_hooks.save()

    return global_hooks, [hook1, hook2]


async def run_test_for_operation(
    test_case,
    operation_type: HookOperation,
    build_operation,
    test_predicate_after: bool = False,
    test_predicate_before: bool = False,
    matching_predicate_resource: Dict = None,
):
    operation = build_operation()

    global_hooks, hooks = build_hooks(
        test_case,
        operation_type,
        test_predicate_after=test_predicate_after,
        test_predicate_before=test_predicate_before,
        matching_predicate_resource=matching_predicate_resource,
    )

    with patch.object(GlobalHooks, 'load_from_file', lambda: global_hooks):
        with patch.object(global_hooks, 'run_hooks') as mock_run_hooks:
            response = await operation.execute()
            test_case.assertIsNone(response.get('error'))

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
                [m.to_dict() for m in mock_run_hooks.mock_calls[7][1][0]],
            )


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

    async def test_list_with_predicates(self):
        await run_test_for_operation(
            self,
            HookOperation.LIST,
            lambda: self.build_list_operation(),
            test_predicate_after=True,
            matching_predicate_resource=dict(
                type=self.pipeline.type,
            ),
        )

    async def test_create(self):
        await run_test_for_operation(
            self,
            HookOperation.CREATE,
            lambda: self.build_create_operation(dict(
                name=self.faker.unique.name(),
                type=self.pipeline.type,
            )),
        )

    async def test_create_with_predicates(self):
        payload = dict(
            name=self.faker.unique.name(),
            type=self.pipeline.type,
        )

        await run_test_for_operation(
            self,
            HookOperation.CREATE,
            lambda: self.build_create_operation(payload),
            test_predicate_after=True,
            test_predicate_before=True,
            matching_predicate_resource=payload,
        )

    async def test_detail(self):
        await run_test_for_operation(
            self,
            HookOperation.DETAIL,
            lambda: self.build_detail_operation(self.pipeline.uuid),
        )

    async def test_detail_with_predicates(self):
        await run_test_for_operation(
            self,
            HookOperation.DETAIL,
            lambda: self.build_detail_operation(self.pipeline.uuid),
            test_predicate_after=True,
            test_predicate_before=True,
        )

    async def test_update(self):
        await run_test_for_operation(
            self,
            HookOperation.UPDATE,
            lambda: self.build_update_operation(self.pipeline.uuid, {}),
        )

    async def test_update_with_predicates(self):
        await run_test_for_operation(
            self,
            HookOperation.UPDATE,
            lambda: self.build_update_operation(self.pipeline.uuid, {}),
            test_predicate_after=True,
            test_predicate_before=True,
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

    async def test_delete_with_predicates(self):
        pipeline = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
            pipeline_type=self.pipeline.type,
        )

        await run_test_for_operation(
            self,
            HookOperation.DELETE,
            lambda: self.build_delete_operation(pipeline.uuid),
            test_predicate_after=True,
            test_predicate_before=True,
            matching_predicate_resource=dict(
                name=pipeline.name,
            ),
        )
