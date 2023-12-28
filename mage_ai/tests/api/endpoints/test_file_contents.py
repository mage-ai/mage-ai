import urllib.parse
from unittest.mock import patch

from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_detail_endpoint_tests,
    build_update_endpoint_tests,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


def get_resource_id(self) -> str:
    block = list(self.pipeline.blocks_by_uuid.values())[0]
    pk = block.file_path.replace(f'{self.pipeline.repo_path}/', '')
    return urllib.parse.quote_plus(pk)


def get_model_before_update(self):
    block = list(self.pipeline.blocks_by_uuid.values())[0]
    return block.file.content()


class FileContentAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_detail_endpoint_tests(
    FileContentAPIEndpointTest,
    resource='file_content',
    get_resource_id=get_resource_id,
    result_keys_to_compare=[
        'content',
        'name',
        'path',
    ],
)


build_update_endpoint_tests(
    FileContentAPIEndpointTest,
    resource='file_content',
    get_resource_id=get_resource_id,
    build_payload=lambda self: dict(content=self.faker.unique.name()),
    get_model_before_update=get_model_before_update,
    assert_after_update=lambda self, result, model: model != result['content'],
)


class FileContentWithProjectPlatformAPIEndpointTest(BaseAPIEndpointTest, ProjectPlatformMixin):
    def setUp(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                super().setUp()
                self.setup_final()

    def tearDown(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.repo.project_platform_activated', lambda: True):
                self.teardown_final()
                super().tearDown()


build_detail_endpoint_tests(
    FileContentWithProjectPlatformAPIEndpointTest,
    resource='file_content',
    get_resource_id=get_resource_id,
    result_keys_to_compare=[
        'content',
        'name',
        'path',
    ],
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
        ('mage_ai.api.resources.FileContentResource.ensure_file_is_in_project', lambda _x: True),
    ],
)


build_update_endpoint_tests(
    FileContentWithProjectPlatformAPIEndpointTest,
    resource='file_content',
    get_resource_id=get_resource_id,
    build_payload=lambda self: dict(content=self.faker.unique.name()),
    get_model_before_update=get_model_before_update,
    assert_after_update=lambda self, result, model, mocks: model != result['content'],
    patch_function_settings=[
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
        ('mage_ai.api.resources.FileContentResource.ensure_file_is_in_project', lambda _x: True),
    ],
)
