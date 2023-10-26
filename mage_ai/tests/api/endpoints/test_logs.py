from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)


class LogsAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    LogsAPIEndpointTest,
    resource='logs',
    list_count=0,
    result_keys_to_compare=[
        'block_run_logs',
        'pipeline_run_logs',
        'total_block_run_log_count',
        'total_pipeline_run_log_count',
    ],
)
