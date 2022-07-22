from enum import Enum

VARIABLE_NAME_BUCKETS = 'buckets'
VARIABLE_NAME_X = 'x'
VARIABLE_NAME_Y = 'y'


class ChartType(str, Enum):
    BAR_CHART = 'bar chart'
    HISTOGRAM = 'histogram'
    PIE_CHART = 'pie chart'


VARIABLE_NAMES_BY_CHART_TYPE = {
    ChartType.BAR_CHART: [
        VARIABLE_NAME_X,
        VARIABLE_NAME_Y,
    ],
    ChartType.HISTOGRAM: [
        VARIABLE_NAME_X,
    ],
    ChartType.PIE_CHART: [
        VARIABLE_NAME_X,
    ],
}
