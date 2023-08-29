from enum import Enum


class ChartDataSourceType(str, Enum):
    BLOCK = 'block'
    BLOCK_RUNS = 'block_runs'
    PIPELINES = 'pipelines'
    PIPELINE_RUNS = 'pipeline_runs'
    PIPELINE_SCHEDULES = 'pipeline_schedules'
