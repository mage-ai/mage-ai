import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Calendar, { TimeType } from '@oracle/components/Calendar';
import ClickOutside from '@oracle/components/ClickOutside';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';

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
import { DATE_TIME_RANGE_SECOND_INTERVAL_MAPPING, DATE_TIME_RANGES, DateTimeRangeEnum, DateTimeRangeQueryEnum } from '@interfaces/DateTimeRangeType';

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
                    if (DATE_TIME_RANGES.includes(range)) {
                        const startTimestamp = calculateStartTimestamp(DATE_TIME_RANGE_SECOND_INTERVAL_MAPPING[range]);
                        goToWithQuery(
                            {
                                [DateTimeRangeQueryEnum.START]: startTimestamp,
                                [DateTimeRangeQueryEnum.END]: null,
                            },
                        );
                    }
                }}
                paddingRight={UNIT * 4}
                placeholder="Select time range"
                value={selectedRange}
            >
                {Object.values(DateTimeRangeEnum).map(range => (
                    <option key={range} value={range}>
                        {range}
                    </option>
                ))}
            </Select>

            <Spacing mr={1} />

            {
                selectedRange === DateTimeRangeEnum.CUSTOM_RANGE && (
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
                                    [DateTimeRangeQueryEnum.START]: unixTimestampFromDate(start),
                                    [DateTimeRangeQueryEnum.END]: unixTimestampFromDate(end),
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