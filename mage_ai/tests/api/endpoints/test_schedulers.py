from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_list_endpoint_tests,
)


class SchedulerAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    SchedulerAPIEndpointTest,
    list_count=1,
    resource='scheduler',
    result_keys_to_compare=[
        'status',
    ],
)


build_create_endpoint_tests(
    SchedulerAPIEndpointTest,
    resource='scheduler',
    test_uuid='start',
    build_payload=lambda self: dict(
        action_type='start',
    ),
    assert_before_create_count=lambda _self: True,
    assert_after_create_count=lambda _self: True,
)


build_create_endpoint_tests(
    SchedulerAPIEndpointTest,
    resource='scheduler',
    test_uuid='stop',
    build_payload=lambda self: dict(
        action_type='stop',
    ),
    assert_before_create_count=lambda _self: True,
    assert_after_create_count=lambda _self: True,
)
