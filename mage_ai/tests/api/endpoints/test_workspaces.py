from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)


class WorkspaceAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    WorkspaceAPIEndpointTest,
    list_count=1,
    resource='workspace',
    result_keys_to_compare=[
        'name',
        'instance',
    ],
)
