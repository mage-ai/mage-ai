import os
import urllib.parse

from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_update_endpoint_tests,
)


def get_resource_id(self) -> str:
    block = list(self.pipeline.blocks_by_uuid.values())[0]
    dir_name = os.path.dirname(block.file_path)
    return urllib.parse.quote_plus(dir_name)


def get_model_before_update(self):
    folder = urllib.parse.unquote(get_resource_id(self)).replace(f'{self.pipeline.repo_path}/', '')
    return dict(path=self.pipeline.repo_path, name=folder)


def get_count(self):
    folders = set()
    dir_name = self.pipeline.repo_path
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
        path=self.pipeline.repo_path,
    ),
    resource='folders',
)

build_update_endpoint_tests(
    FolderAPIEndpointTest,
    resource='folders',
    get_resource_id=lambda self: get_resource_id(self),
    build_payload=lambda self: dict(
        path=self.pipeline.repo_path,
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
