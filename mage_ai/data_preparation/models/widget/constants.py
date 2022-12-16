from enum import Enum
from dateutil.relativedelta import relativedelta


VARIABLE_NAME_BUCKETS = 'buckets'
VARIABLE_NAME_GROUP_BY = 'group_by'
VARIABLE_NAME_INDEX = 'index'
VARIABLE_NAME_LIMIT = 'limit'
VARIABLE_NAME_METRICS = 'metrics'
VARIABLE_NAME_TIME_INTERVAL = 'time_interval'
VARIABLE_NAME_X = 'x'
VARIABLE_NAME_Y = 'y'


class AggregationFunction(str, Enum):
    AVERAGE = 'average'
    COUNT = 'count'
    COUNT_DISTINCT = 'count_distinct'
    MAX = 'max'
    MEDIAN = 'median'
    MIN = 'min'
    MODE = 'mode'
    SUM = 'sum'


class TimeInterval(str, Enum):
    DAY = 'day'
    HOUR = 'hour'
    MINUTE = 'minute'
    MONTH = 'month'
    ORIGINAL = 'original'
    SECOND = 'second'
    WEEK = 'week'
    YEAR = 'year'


class ChartType(str, Enum):
    BAR_CHART = 'bar chart'
    HISTOGRAM = 'histogram'
    LINE_CHART = 'line chart'
    PIE_CHART = 'pie chart'
    TABLE = 'table'
    TIME_SERIES_BAR_CHART = 'time series bar chart'
    TIME_SERIES_LINE_CHART = 'time series line chart'


TIME_INTERVAL_TO_TIME_DELTA = {
    TimeInterval.DAY: relativedelta(days=1),
    TimeInterval.HOUR: relativedelta(hours=1),
    TimeInterval.MINUTE: relativedelta(minutes=1),
    TimeInterval.MONTH: relativedelta(months=1),
    TimeInterval.SECOND: relativedelta(seconds=1),
    TimeInterval.WEEK: relativedelta(weeks=1),
    TimeInterval.YEAR: relativedelta(years=1),
}


VARIABLE_NAMES_BY_CHART_TYPE = {
    ChartType.BAR_CHART: [
        VARIABLE_NAME_X,
        VARIABLE_NAME_Y,
    ],
    ChartType.HISTOGRAM: [
        VARIABLE_NAME_X,
    ],
    ChartType.LINE_CHART: [
        VARIABLE_NAME_X,
        VARIABLE_NAME_Y,
    ],
    ChartType.PIE_CHART: [
        VARIABLE_NAME_X,
    ],
    ChartType.TABLE: [
        VARIABLE_NAME_INDEX,
        VARIABLE_NAME_X,
        VARIABLE_NAME_Y,
    ],
}
