import urllib.parse

from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_detail_endpoint_tests,
    build_update_endpoint_tests,
)


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
