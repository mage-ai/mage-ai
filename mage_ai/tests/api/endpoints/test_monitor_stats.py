from mage_ai.orchestration.monitor.monitor_stats import MonitorStatsType
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_detail_endpoint_tests,
)


class MonitorStatAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_detail_endpoint_tests(
    MonitorStatAPIEndpointTest,
    resource='monitor_stat',
    get_resource_id=lambda _self: MonitorStatsType.PIPELINE_RUN_COUNT,
    result_keys_to_compare=[
        'stats_type',
        'stats',
    ],
)
