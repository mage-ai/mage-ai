import os
import urllib.parse
from unittest.mock import patch

from mage_ai.settings.utils import base_repo_path
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


def get_resource_id(self) -> str:
    block = list(self.pipeline.blocks_by_uuid.values())[0]
    pk = block.file_path.replace(f'{self.pipeline.repo_path}/', '')
    return urllib.parse.quote_plus(pk)


def get_model_before_update(self):
    block = list(self.pipeline.blocks_by_uuid.values())[0]
    return block.file


def get_files_count(self):
    files = set()
    for block in self.pipeline.blocks_by_uuid.values():
        dir_name = os.path.dirname(block.file_path)
        for filename in os.listdir(dir_name):
            if filename == '__init__.py':
                continue
            files.add(os.path.join(dir_name, filename))

    return len(list(files))


class FileAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.files_count = get_files_count(self)


build_list_endpoint_tests(
    FileAPIEndpointTest,
    list_count=1,
    resource='files',
    result_keys_to_compare=[
        'children',
        'name',
    ],
)


def __assert_after(test_case, result, *args, **kwargs):
    arr = []
    for file in result:
        for child in file['children']:
            if child['name'] == 'pipelines':
                for child2 in child['children']:
                    arr.append(child2['children'])
            else:
                arr.append(child['children'])

    test_case.assertTrue(all(len(a) == 0 for a in arr))


build_list_endpoint_tests(
    FileAPIEndpointTest,
    list_count=1,
    resource='files',
    result_keys_to_compare=[
        'children',
        'name',
    ],
    build_query=lambda _x: dict(
        pattern=['do_not_match_anything'],
    ),
    test_uuid='with_search',
    assert_after=__assert_after,
)


build_create_endpoint_tests(
    FileAPIEndpointTest,
    assert_after_create_count=lambda self: get_files_count(self) == self.files_count + 1,
    assert_before_create_count=lambda self: get_files_count(self) == self.files_count,
    build_payload=lambda self: dict(
        dir_path=os.path.dirname(get_model_before_update(self).file_path),
        name=self.faker.unique.name().replace(' ', '_'),
    ),
    resource='files',
)

build_update_endpoint_tests(
    FileAPIEndpointTest,
    resource='files',
    get_resource_id=lambda self: get_resource_id(self),
    build_payload=lambda self: dict(
        dir_path=os.path.dirname(get_model_before_update(self).file_path),
        name=self.faker.unique.name().replace(' ', '_'),
    ),
    get_model_before_update=get_model_before_update,
    assert_after_update=lambda self, result, model: model.filename != result['name'],
)


build_delete_endpoint_tests(
    FileAPIEndpointTest,
    assert_after_delete_count=lambda self: get_files_count(self) == self.files_count - 1,
    assert_before_delete_count=lambda self: get_files_count(self) == self.files_count,
    get_resource_id=lambda self: get_resource_id(self),
    resource='files',
)


def get_files_count_project_platform(self):
    with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
        with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
            files = set()
            for block in self.pipeline.blocks_by_uuid.values():
                dir_name = os.path.join(base_repo_path(), os.path.dirname(block.file_path))
                os.makedirs(dir_name, exist_ok=True)

                for filename in os.listdir(dir_name):
                    if filename == '__init__.py':
                        continue
                    files.add(os.path.join(dir_name, filename))

            return len(list(files))


class FileWithProjectPlatformAPIEndpointTest(BaseAPIEndpointTest, ProjectPlatformMixin):
    def setUp(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                super().setUp()
                self.setup_final()
                self.files_count = get_files_count_project_platform(self)

    def tearDown(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                self.teardown_final()
                super().tearDown()


build_create_endpoint_tests(
    FileWithProjectPlatformAPIEndpointTest,
    assert_before_create_count=lambda self, mocks: (
        get_files_count_project_platform(self) == self.files_count
    ),
    assert_after_create_count=lambda self, mocks: (
        get_files_count_project_platform(self) == self.files_count + 1
    ),
    build_payload=lambda self: dict(
        dir_path=os.path.dirname(get_model_before_update(self).file_path),
        name=self.faker.unique.name().replace(' ', '_'),
    ),
    resource='files',
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
    ],
)
