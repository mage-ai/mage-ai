from mage_ai.server.kernels import KernelName, kernel_managers
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


class KernelAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    KernelAPIEndpointTest,
    resource='kernels',
    list_count=0,
    result_keys_to_compare=[
        'alive',
        'id',
        'name',
        'usage',
    ],
)


build_update_endpoint_tests(
    KernelAPIEndpointTest,
    resource='kernels',
    get_resource_id=lambda _self: KernelName.PYTHON3,
    build_payload=lambda self: dict(action_type='restart'),
    get_model_before_update=lambda _self: kernel_managers[KernelName.PYTHON3],
    assert_after_update=lambda _self, _payload, _model: True,
)
