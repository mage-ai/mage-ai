from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_detail_endpoint_tests,
)


class BlockOutputAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_detail_endpoint_tests(
    BlockOutputAPIEndpointTest,
    resource='block_output',
    get_resource_id=lambda self: list(self.pipeline.blocks_by_uuid.keys())[0],
    result_keys_to_compare=[
        'outputs',
    ],
    build_query=lambda self: dict(pipeline_uuid=[self.pipeline.uuid]),
)
