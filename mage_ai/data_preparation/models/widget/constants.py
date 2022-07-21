from enum import Enum

VARIABLE_NAME_BUCKETS = 'buckets'
VARIABLE_NAME_X = 'x'


class ChartType(str, Enum):
    HISTOGRAM = 'histogram'
    PIE_CHART = 'pie chart'


VARIABLE_NAMES_BY_CHART_TYPE = {
  ChartType.HISTOGRAM: [
    VARIABLE_NAME_X,
  ],
}
