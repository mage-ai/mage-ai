import json
import os
import shutil
from typing import Callable, Dict, List
from unittest.mock import patch

import yaml

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
from mage_ai.settings.platform import (
    build_repo_path_for_all_projects,
    local_platform_settings_full_path,
    platform_settings_full_path,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.io import safe_write
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.base_test import AsyncDBTestCase
from mage_ai.tests.factory import (
    build_pipeline_with_blocks_and_content,
    create_pipeline_with_blocks,
)

CURRENT_FILE_PATH = os.path.dirname(os.path.realpath(__file__))


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


@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
@patch('mage_ai.orchestration.db.models.schedules.project_platform_activated', lambda: True)
class ProjectPlatformMixin(AsyncDBTestCase):
    @classmethod
    def initialize_settings(self, settings: Dict = None):
        self.platform_project_name = 'mage_platform'
        content = yaml.dump(settings or dict(
            projects={
                self.platform_project_name: {},
                'mage_data': {},
            },
        ))
        safe_write(platform_settings_full_path(), content)

        content = yaml.dump(dict(
            projects={
                self.platform_project_name: dict(active=True),
            },
        ))
        safe_write(local_platform_settings_full_path(), content)

    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.initialize_settings()

    @classmethod
    def tearDownClass(self):
        if os.path.exists(platform_settings_full_path()) and \
                base_repo_path() != platform_settings_full_path():

            os.remove(platform_settings_full_path())

        if os.path.exists(local_platform_settings_full_path()) and \
                base_repo_path() != local_platform_settings_full_path():

            os.remove(local_platform_settings_full_path())

        try:
            super().tearDownClass()
        except Exception as err:
            print(f'[ERROR] ProjectPlatformMixin.tearDownClass: {err}.')

    def setup_final(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                super().setUp()
                self.repo_path = get_repo_path(root_project=False)
                self.pipeline, self.blocks = create_pipeline_with_blocks(
                    self.faker.unique.name(),
                    self.repo_path,
                    return_blocks=True,
                )
                self.repo_paths = build_repo_path_for_all_projects(mage_projects_only=True)

    def teardown_final(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                try:
                    shutil.rmtree(platform_settings_full_path())
                except Exception:
                    pass
                try:
                    shutil.rmtree(local_platform_settings_full_path())
                except Exception:
                    pass
                super().tearDown()

    def setUp(self):
        self.setup_final()

    def tearDown(self):
        self.teardown_final()


def setup_dbt_project(repo_path: str) -> str:
    dbt_directory = os.path.join(repo_path, 'dbt')
    os.makedirs(dbt_directory, exist_ok=True)

    source_dir = os.path.join(CURRENT_FILE_PATH, 'mocks', 'dbt')

    if os.path.exists(dbt_directory):
        shutil.rmtree(dbt_directory)
    shutil.copytree(source_dir, dbt_directory)

    return dbt_directory


def remove_dbt_project(project_path: str = None, repo_path: str = None):
    dbt_directory = project_path or os.path.join(repo_path, 'dbt')
    try:
        if os.path.exists(dbt_directory):
            shutil.rmtree(dbt_directory)
    except Exception as err:
        print(f'[ERROR] remove_dbt_project: {err}.')


def setup_custom_design(repo_path: str, mock_design_filename: str = None) -> str:
    destination = os.path.join(repo_path, 'design.yaml')
    os.makedirs(os.path.dirname(destination), exist_ok=True)

    if os.path.exists(destination):
        os.remove(destination)

    source = os.path.join(CURRENT_FILE_PATH, 'mocks', mock_design_filename or 'mock_design.yaml')
    shutil.copyfile(source, destination)

    return destination


def remove_custom_design(
    project_path: str = None,
    repo_path: str = None,
    mock_design_filename: str = None,
):
    destination = os.path.join(repo_path, 'design.yaml')
    try:
        if os.path.exists(destination):
            os.remove(destination)
    except Exception as err:
        print(f'[ERROR] remove_custom_design: {err}.')


class DBTMixin(AsyncDBTestCase):
    def setUp(self):
        super().setUp()

        self.dbt_directory = setup_dbt_project(self.repo_path)

    def tearDown(self):
        remove_dbt_project(repo_path=self.repo_path)
        super().tearDown()


class CustomDesignMixin:
    def setUp(self):
        super().setUp()

        setup_custom_design(self.repo_path)

        if hasattr(self, 'repo_paths'):
            for paths in self.repo_paths.values():
                full_path = paths.get('full_path')
                if full_path == self.repo_path:
                    continue
                setup_custom_design(repo_path=full_path, mock_design_filename='mock_design2.yaml')

    def tearDown(self):
        remove_custom_design(repo_path=self.repo_path)

        if hasattr(self, 'repo_paths'):
            for paths in self.repo_paths.values():
                full_path = paths.get('full_path')
                if full_path == self.repo_path:
                    continue
                remove_custom_design(
                    repo_path=full_path,
                    mock_design_filename='mock_design2.yaml',
                )

        super().tearDown()
