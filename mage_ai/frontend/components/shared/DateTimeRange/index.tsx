import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Calendar, { TimeType } from '@oracle/components/Calendar';
import ClickOutside from '@oracle/components/ClickOutside';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { LogRangeEnum } from '@interfaces/LogType';

import { UNIT } from '@oracle/styles/units/spacing';
import { calculateStartTimestamp } from '@utils/number';
import {
    isoDateFormatFromDateParts,
    padTime,
    unixTimestampFromDate,
    utcDateFromDateAndTime,
} from '@utils/date';
import { goToWithQuery } from '@utils/routing';
import FlexContainer from '@oracle/components/FlexContainer';

enum RangeQueryEnum {
    START = 'start_timestamp',
    END = 'end_timestamp',
}

const RANGES = [
    LogRangeEnum.LAST_HOUR,
    LogRangeEnum.LAST_DAY,
    LogRangeEnum.LAST_WEEK,
    LogRangeEnum.LAST_30_DAYS,
];

const RANGE_SECOND_INTERVAL_MAPPING = {
    [LogRangeEnum.LAST_HOUR]: 3600,
    [LogRangeEnum.LAST_DAY]: 86400,
    [LogRangeEnum.LAST_WEEK]: 604800,
    [LogRangeEnum.LAST_30_DAYS]: 2592000,
};

function DateTimeRange({ setSelectedRange, selectedRange }) {
    const [showCalendarIndex, setShowCalendarIndex] = useState<number>(null);
    const [startDate, setStartDate] = useState<Date>(null);
    const [startTime, setStartTime] = useState<TimeType>({ hour: '00', minute: '00' });
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<TimeType>({
        hour: padTime(String(new Date().getUTCHours())),
        minute: padTime(String(new Date().getUTCMinutes())),
    });

    return (
        <FlexContainer alignItems="center">
            <Select
                compact
                defaultColor
                onChange={e => {
                    e.preventDefault();
                    const range = e.target.value;
                    setSelectedRange(range);
                    if (RANGES.includes(range)) {
                        const startTimestamp = calculateStartTimestamp(RANGE_SECOND_INTERVAL_MAPPING[range]);
                        goToWithQuery(
                            {
                                [RangeQueryEnum.START]: startTimestamp,
                                [RangeQueryEnum.END]: null,
                            },
                        );
                    }
                }}
                paddingRight={UNIT * 4}
                placeholder="Select time range"
                value={selectedRange}
            >
                {Object.values(LogRangeEnum).map(range => (
                    <option key={range} value={range}>
                        {range}
                    </option>
                ))}
            </Select>

            <Spacing mr={1} />

            {
                selectedRange === LogRangeEnum.CUSTOM_RANGE && (
                    <>
                        <TextInput
                            compact
                            defaultColor
                            onClick={() => setShowCalendarIndex(0)}
                            paddingRight={0}
                            placeholder="Start"
                            value={startDate
                                ? utcDateFromDateAndTime(startDate, startTime?.hour, startTime?.minute)
                                : ''
                            }
                        />
                        <ClickOutside
                            onClickOutside={() => setShowCalendarIndex(null)}
                            open={showCalendarIndex === 0}
                            style={{ position: 'relative' }}
                        >
                            <Calendar
                                selectedDate={startDate}
                                selectedTime={startTime}
                                setSelectedDate={setStartDate}
                                setSelectedTime={setStartTime}
                            />
                        </ClickOutside>

                        <Spacing px={1}>
                            <Text>
                                to
                            </Text>
                        </Spacing>

                        <TextInput
                            compact
                            defaultColor
                            onClick={() => setShowCalendarIndex(1)}
                            paddingRight={0}
                            placeholder="End"
                            value={endDate
                                ? utcDateFromDateAndTime(endDate, endTime?.hour, endTime?.minute)
                                : ''
                            }
                        />
                        <ClickOutside
                            onClickOutside={() => setShowCalendarIndex(null)}
                            open={showCalendarIndex === 1}
                            style={{ position: 'relative' }}
                        >
                            <Calendar
                                selectedDate={endDate}
                                selectedTime={endTime}
                                setSelectedDate={setEndDate}
                                setSelectedTime={setEndTime}
                            />
                        </ClickOutside>

                        <Spacing mr={1} />

                        <Button
                            borderRadius={`${UNIT / 2}px`}
                            onClick={() => {
                                const start = isoDateFormatFromDateParts(startDate, startTime.hour, startTime.minute);
                                const end = isoDateFormatFromDateParts(endDate, endTime.hour, endTime.minute);
                                goToWithQuery({
                                    [RangeQueryEnum.START]: unixTimestampFromDate(start),
                                    [RangeQueryEnum.END]: unixTimestampFromDate(end),
                                });
                            }}
                            padding={`${UNIT / 2}px`}
                            primary
                        >
                            Filter
                        </Button>
                    </>
                )
            }
        </FlexContainer>)
};

export default DateTimeRange;