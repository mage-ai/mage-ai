import { useEffect, useState } from 'react';

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
  getDatePartsFromUnixTimestamp,
  isoDateFormatFromDateParts,
  padTime,
  unixTimestampFromDate,
  utcDateFromDateAndTime,
} from '@utils/date';
import { goToWithQuery } from '@utils/routing';
import FlexContainer from '@oracle/components/FlexContainer';
import {
  DATE_TIME_RANGE_SECOND_INTERVAL_MAPPING,
  DATE_TIME_RANGES,
  DateTimeRangeEnum,
  DateTimeRangeProps,
  DateTimeRangeQueryEnum,
} from '@interfaces/DateTimeRangeType';

function DateTimeRange({ timestamps, setSelectedRange, selectedRange }: DateTimeRangeProps) {
  const [showCalendarIndex, setShowCalendarIndex] = useState<number>(null);
  const [startDate, setStartDate] = useState<Date>(null);
  const [startTime, setStartTime] = useState<TimeType>({ hour: '00', minute: '00' });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<TimeType>({
    hour: padTime(String(new Date().getUTCHours())),
    minute: padTime(String(new Date().getUTCMinutes())),
  });

  useEffect(
    () => {
      const { start_timestamp: initialStart, end_timestamp: initialEnd } = timestamps;

      if (initialStart) {
        const {
          date: initialStartDate,
          hour: initialStartHour,
          minute: initialStartMinute,
        } = getDatePartsFromUnixTimestamp(initialStart);
        setStartDate(initialStartDate);
        setStartTime({
          hour: padTime(initialStartHour),
          minute: padTime(initialStartMinute),
        });

        const secondsAgo = Math.ceil(Date.now() / 1000) - initialStart;
        const presets = [
          DateTimeRangeEnum.LAST_HOUR,
          DateTimeRangeEnum.LAST_DAY,
          DateTimeRangeEnum.LAST_WEEK,
          DateTimeRangeEnum.LAST_30_DAYS,
        ];

        for (const preset of presets) {
          const targetSeconds = DATE_TIME_RANGE_SECOND_INTERVAL_MAPPING[preset];
          if (typeof targetSeconds === 'number'
            && Math.abs(secondsAgo - targetSeconds) <= 60
          ) {
            setSelectedRange(preset);
            break;
          }
        }
      }

      if (initialEnd) {
        const {
          date: initialEndDate,
          hour: initialEndHour,
          minute: initialEndMinute,
        } = getDatePartsFromUnixTimestamp(initialEnd);
        setEndDate(initialEndDate);
        setEndTime({
          hour: padTime(initialEndHour),
          minute: padTime(initialEndMinute),
        });
      }

      if (initialStart && initialEnd) {
        setSelectedRange(DateTimeRangeEnum.CUSTOM_RANGE);
      }
    },
    // Initialize state from URL params on mount.
    // Avoid re-running on query changes to prevent overwriting user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
            const startTimestamp = calculateStartTimestamp(
              DATE_TIME_RANGE_SECOND_INTERVAL_MAPPING[range],
            );
            goToWithQuery({
              [DateTimeRangeQueryEnum.START]: startTimestamp,
              [DateTimeRangeQueryEnum.END]: null,
              offset: null,
              page: null,
            });
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

      {selectedRange === DateTimeRangeEnum.CUSTOM_RANGE && (
        <>
          <TextInput
            compact
            defaultColor
            onClick={() => setShowCalendarIndex(0)}
            paddingRight={0}
            placeholder="Start"
            value={
              startDate ? utcDateFromDateAndTime(startDate, startTime?.hour, startTime?.minute) : ''
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
            <Text>to</Text>
          </Spacing>

          <TextInput
            compact
            defaultColor
            onClick={() => setShowCalendarIndex(1)}
            paddingRight={0}
            placeholder="End"
            value={endDate ? utcDateFromDateAndTime(endDate, endTime?.hour, endTime?.minute) : ''}
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
                offset: null,
                page: null,
              });
            }}
            padding={`${UNIT / 2}px`}
            primary
          >
            Filter
          </Button>
        </>
      )}
    </FlexContainer>
  );
}

export default DateTimeRange;
