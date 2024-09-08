try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

DEFAULT_LIMIT = 10000


class ChartDataSourceType(StrEnum):
    BLOCK = 'block'
    BLOCK_RUNS = 'block_runs'
    CHART_CODE = 'chart_code'
    PIPELINES = 'pipelines'
    PIPELINE_RUNS = 'pipeline_runs'
    PIPELINE_SCHEDULES = 'pipeline_schedules'
    SYSTEM_METRICS = 'system_metrics'
