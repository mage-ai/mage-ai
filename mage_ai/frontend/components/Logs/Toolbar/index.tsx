import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Calendar, { TimeType } from '@oracle/components/Calendar';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import usePrevious from '@utils/usePrevious';
import { LogRangeEnum } from '@interfaces/LogType';
import {
  LOG_FILE_COUNT_INTERVAL,
  LOG_RANGE_SEC_INTERVAL_MAPPING,
  SPECIFIC_LOG_RANGES,
} from './constants';
import { MetaQueryEnum } from '@api/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { calculateStartTimestamp } from '@utils/number';
import {
  getDatePartsFromUnixTimestamp,
  isoDateFormatFromDateParts,
  padTime,
  unixTimestampFromDate,
  utcDateFromDateAndTime,
} from '@utils/date';
import { getLogScrollPositionLocalStorageKey } from '../utils';
import { goToWithQuery } from '@utils/routing';
import { isEqual } from '@utils/hash';
import { queryFromUrl } from '@utils/url';
import { set } from '@storage/localStorage';


enum RangeQueryEnum {
  START = 'start_timestamp',
  END = 'end_timestamp',
}

type LogToolbarProps = {
  allPastLogsLoaded: boolean;
  loadNewerLogInterval: () => void;
  loadPastLogInterval: () => void;
  saveScrollPosition?: boolean;
  selectedRange: LogRangeEnum;
  setSelectedRange: (range: LogRangeEnum) => void;
};

const SHARED_LOG_QUERY_PARAMS = {
  [MetaQueryEnum.LIMIT]: LOG_FILE_COUNT_INTERVAL,
  [MetaQueryEnum.OFFSET]: 0,
};

export const SHARED_BUTTON_PROPS = {
  blackBorder: true,
  inline: true,
  paddingBottom: UNIT * 0.75,
  paddingTop: UNIT * 0.75,
};

function LogToolbar({
  allPastLogsLoaded,
  loadNewerLogInterval,
  loadPastLogInterval,
  saveScrollPosition,
  selectedRange,
  setSelectedRange,
}: LogToolbarProps) {
  const [showCalendarIndex, setShowCalendarIndex] = useState<number>(null);
  const [startDate, setStartDate] = useState<Date>(null);
  const [startTime, setStartTime] = useState<TimeType>({ hour: '00', minute: '00' });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<TimeType>({
    hour: padTime(String(new Date().getUTCHours())),
    minute: padTime(String(new Date().getUTCMinutes())),
  });

  const router = useRouter();
  const { pipeline: pipelineUUID }: any = router.query;
  const q = queryFromUrl();
  const qPrev = usePrevious(q);
  useEffect(() => {
    if (!isEqual(q, qPrev)) {
      const {
        start_timestamp: initialStart,
        end_timestamp: initialEnd,
      } = q;

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

        const secondsAgo = (Math.ceil(Date.now() / 1000) - initialStart);
        if (Math.abs(secondsAgo - LOG_RANGE_SEC_INTERVAL_MAPPING[LogRangeEnum.LAST_DAY]) <= 60) {
          setSelectedRange(LogRangeEnum.LAST_DAY);
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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    q,
    qPrev,
  ]);

  const resetLogScrollPosition = useCallback(() => {
    if (saveScrollPosition) {
      const localStorageKey = getLogScrollPositionLocalStorageKey(pipelineUUID);
      set(localStorageKey, 0);
    }
  }, [pipelineUUID, saveScrollPosition]);

  return (
    <Spacing py={1}>
      <FlexContainer alignItems="center">
        <KeyboardShortcutButton
          {...SHARED_BUTTON_PROPS}
          disabled={allPastLogsLoaded}
          onClick={() => {
            resetLogScrollPosition();
            loadPastLogInterval();
          }}
          uuid="logs/load_older_logs"
        >
          {allPastLogsLoaded ? 'All past logs within range loaded' : 'Load older logs'}
        </KeyboardShortcutButton>

        <Spacing mr={1} />

        <KeyboardShortcutButton
          {...SHARED_BUTTON_PROPS}
          disabled={q?._offset <= 0}
          onClick={() => {
            resetLogScrollPosition();
            loadNewerLogInterval();
          }}
          uuid="logs/load_newer_logs"
        >
          Load newer logs
        </KeyboardShortcutButton>

        <Spacing mr={2} />

        <Select
          compact
          defaultColor
          onChange={e => {
            e.preventDefault();
            const range = e.target.value;
            resetLogScrollPosition();
            setSelectedRange(range);
            if (SPECIFIC_LOG_RANGES.includes(range)) {
              const startTimestamp = calculateStartTimestamp(LOG_RANGE_SEC_INTERVAL_MAPPING[range]);
              goToWithQuery(
                {
                  [RangeQueryEnum.START]: startTimestamp,
                  [RangeQueryEnum.END]: null,
                  ...SHARED_LOG_QUERY_PARAMS,
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

        {selectedRange === LogRangeEnum.CUSTOM_RANGE && (
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
                resetLogScrollPosition();
                const start = isoDateFormatFromDateParts(startDate, startTime.hour, startTime.minute);
                const end = isoDateFormatFromDateParts(endDate, endTime.hour, endTime.minute);
                goToWithQuery({
                  [RangeQueryEnum.START]: unixTimestampFromDate(start),
                  [RangeQueryEnum.END]: unixTimestampFromDate(end),
                  ...SHARED_LOG_QUERY_PARAMS,
                });
              }}
              padding={`${UNIT / 2}px`}
              primary
            >
              Search
            </Button>
          </>
        )}
      </FlexContainer>
    </Spacing>
  );
}

export default LogToolbar;
