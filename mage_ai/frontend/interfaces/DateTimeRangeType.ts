export enum DateTimeRangeQueryEnum {
    START = 'start_timestamp',
    END = 'end_timestamp',
}

export enum DateTimeRangeEnum {
    LAST_HOUR = 'Last hour',
    LAST_DAY = 'Last day',
    LAST_WEEK = 'Last week',
    LAST_30_DAYS = 'Last 30 days',
    CUSTOM_RANGE = 'Custom range',
}

export const DATE_TIME_RANGES = [
    DateTimeRangeEnum.LAST_HOUR,
    DateTimeRangeEnum.LAST_DAY,
    DateTimeRangeEnum.LAST_WEEK,
    DateTimeRangeEnum.LAST_30_DAYS,
];

export const DATE_TIME_RANGE_SECOND_INTERVAL_MAPPING = {
    [DateTimeRangeEnum.LAST_HOUR]: 3600,
    [DateTimeRangeEnum.LAST_DAY]: 86400,
    [DateTimeRangeEnum.LAST_WEEK]: 604800,
    [DateTimeRangeEnum.LAST_30_DAYS]: 2592000,
};
