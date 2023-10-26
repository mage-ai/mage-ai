import os
import urllib.parse

from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


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
