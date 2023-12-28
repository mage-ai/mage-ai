import os
import urllib.parse
from unittest.mock import patch

from mage_ai.settings.repo import get_repo_path
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_update_endpoint_tests,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


def get_resource_id(self) -> str:
    block = list(self.pipeline.blocks_by_uuid.values())[0]
    dir_name = os.path.dirname(block.file_path)
    return urllib.parse.quote_plus(dir_name)


def get_model_before_update(self):
    folder = urllib.parse.unquote(get_resource_id(self)).replace(f'{self.pipeline.repo_path}/', '')
    return dict(path=get_repo_path(root_project=False), name=folder)


def get_count(self):
    folders = set()
    dir_name = get_repo_path(root_project=False)
    for filename in os.listdir(dir_name):
        full_path = os.path.join(dir_name, filename)
        if not os.path.isdir(full_path):
            continue
        folders.add(full_path)

    return len(list(folders))


class FolderAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.count = get_count(self)


build_create_endpoint_tests(
    FolderAPIEndpointTest,
    assert_after_create_count=lambda self: get_count(self) == self.count + 1,
    assert_before_create_count=lambda self: get_count(self) == self.count,
    build_payload=lambda self: dict(
        name=self.faker.unique.name().replace(' ', '_'),
        path=get_repo_path(root_project=False),
    ),
    resource='folders',
)

build_update_endpoint_tests(
    FolderAPIEndpointTest,
    resource='folders',
    get_resource_id=lambda self: get_resource_id(self),
    build_payload=lambda self: dict(
        path=get_repo_path(root_project=False),
        name=self.faker.unique.name().replace(' ', '_'),
    ),
    get_model_before_update=get_model_before_update,
    assert_after_update=lambda self, result, model: model['name'] != result['name'],
)


build_delete_endpoint_tests(
    FolderAPIEndpointTest,
    assert_after_delete_count=lambda self: get_count(self) == self.count - 1,
    assert_before_delete_count=lambda self: get_count(self) == self.count,
    get_resource_id=lambda self: get_resource_id(self),
    resource='folders',
)


def get_count_pp(test_case) -> int:
    with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
        with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
            with patch(
                'mage_ai.data_preparation.models.file.project_platform_activated',
                lambda: True,
            ):
                folders = set()
                dir_name = get_repo_path(root_project=False)
                for filename in os.listdir(dir_name):
                    full_path = os.path.join(dir_name, filename)
                    if not os.path.isdir(full_path):
                        continue
                    folders.add(full_path)

                return len(list(folders))


class FolderWithProjectPlatformAPIEndpointTest(BaseAPIEndpointTest, ProjectPlatformMixin):
    def setUp(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                with patch(
                    'mage_ai.data_preparation.models.file.project_platform_activated',
                    lambda: True,
                ):
                    super().setUp()
                    self.setup_final()
            self.count = get_count_pp(self)

    def tearDown(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                with patch(
                    'mage_ai.data_preparation.models.file.project_platform_activated',
                    lambda: True,
                ):
                    self.teardown_final()
                    super().tearDown()


build_create_endpoint_tests(
    FolderWithProjectPlatformAPIEndpointTest,
    assert_after_create_count=lambda self, mocks: get_count_pp(self) == self.count + 1,
    assert_before_create_count=lambda self, mocks: get_count_pp(self) == self.count,
    build_payload=lambda self: dict(
        name=self.faker.unique.name().replace(' ', '_'),
        path=get_repo_path(root_project=False),
    ),
    resource='folders',
    patch_function_settings=[
        ('mage_ai.data_preparation.models.file.project_platform_activated', lambda: True),
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
        ('mage_ai.api.resources.FolderResource.ensure_file_is_in_project', lambda _x: True),
    ],
)

build_update_endpoint_tests(
    FolderWithProjectPlatformAPIEndpointTest,
    resource='folders',
    get_resource_id=lambda self: get_resource_id(self),
    build_payload=lambda self: dict(
        path=get_repo_path(root_project=False),
        name=self.faker.unique.name().replace(' ', '_'),
    ),
    get_model_before_update=get_model_before_update,
    assert_after_update=lambda self, result, model, mocks: model['name'] != result['name'],
    patch_function_settings=[
        ('mage_ai.data_preparation.models.file.project_platform_activated', lambda: True),
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
        ('mage_ai.api.resources.FolderResource.ensure_file_is_in_project', lambda _x: True),
    ],
)


build_delete_endpoint_tests(
    FolderWithProjectPlatformAPIEndpointTest,
    assert_after_delete_count=lambda self, mocks: get_count_pp(self) == self.count - 1,
    assert_before_delete_count=lambda self, mocks: get_count_pp(self) == self.count,
    get_resource_id=lambda self: get_resource_id(self),
    resource='folders',
    patch_function_settings=[
        ('mage_ai.data_preparation.models.file.project_platform_activated', lambda: True),
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
        ('mage_ai.api.resources.FolderResource.ensure_file_is_in_project', lambda _x: True),
    ],
)
