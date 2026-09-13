import React, { useEffect, useState } from 'react';

import Button from '@oracle/elements/Button';
import Calendar, { TimeType } from '@oracle/components/Calendar';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import {
  BeforeStyle,
  ContainerStyle,
  ContentStyle,
  MainStyle,
  OptionStyle,
  ToggleValueStyle,
} from './index.style';
import { ChevronRight, Close } from '@oracle/icons';
import { goToWithMixedFilters } from '@utils/routing';
import { MetaQueryEnum } from '@api/constants';
import { ROW_LIMIT } from '@components/shared/Paginate';
import {
  getDatePartsFromUnixTimestamp,
  isoDateFormatFromDateParts,
  padTime,
  unixTimestampFromDate,
  utcDateFromDateAndTime,
} from '@utils/date';
import { capitalize, removeUnderscore } from '@utils/string';

export type DateRangeOptionType = {
  type: 'date_range';
  startKey: string;
  endKey: string;
  startValue?: string | null;
  endValue?: string | null;
};

type ToggleOptionType = {
  [keyof: string]: boolean;
};

type FilterOptionType = ToggleOptionType | DateRangeOptionType;

function isDateRangeOption(option: FilterOptionType): option is DateRangeOptionType {
  return option && (option as DateRangeOptionType).type === 'date_range';
}

const DEFAULT_START_TIME: TimeType = { hour: '00', minute: '00' };
const DEFAULT_END_TIME: TimeType = { hour: '23', minute: '59' };

type DateRangeStateType = {
  startDate: Date | null;
  startTime: TimeType;
  endDate: Date | null;
  endTime: TimeType;
};

type ToggleListProps = {
  optionKey: string;
  options: ToggleOptionType;
  setFilterState: React.Dispatch<React.SetStateAction<{
    [key: string]: ToggleOptionType | DateRangeStateType;
  }>>;
  toggleValueMapping?: {
    [keyof: string]: string | (() => string);
  };
};

function ToggleList({
  optionKey,
  options,
  setFilterState,
  toggleValueMapping,
}: ToggleListProps) {
  return (
    <>
      {Object.entries(options || {}).map(([value, enabled]) => {
        const optionValue = (typeof toggleValueMapping?.[value] === 'function'
          // @ts-ignore
          ? capitalize(toggleValueMapping?.[value]?.())
          : toggleValueMapping?.[value]
        ) || value;

        return (
          <ToggleValueStyle key={value}>
            <Text
              title={!toggleValueMapping ? optionValue : null}
              width={200}
            >
              {optionValue}
            </Text>
            <ToggleSwitch
              checked={enabled}
              onCheck={() => setFilterState(prevState => ({
                ...prevState,
                [optionKey]: {
                  ...prevState?.[optionKey],
                  [value]: !enabled,
                },
              }))}
            />
          </ToggleValueStyle>
        );
      })}
    </>
  );
}

type DateRangePickerProps = {
  dateRange: DateRangeStateType;
  optionKey: string;
  setFilterState: React.Dispatch<React.SetStateAction<{
    [key: string]: ToggleOptionType | DateRangeStateType;
  }>>;
  showCalendarIndex: number | null;
  setShowCalendarIndex: (idx: number | null) => void;
};

// TODO: Closing calendar on date selection would be better UX, but
//  keeping it open for consistency with calendar behavior elsewhere in the app.
// TODO: Validate that start date is not after end date and vice versa, showing an inline error message.
function DateRangePicker({
  dateRange,
  optionKey,
  setFilterState,
  showCalendarIndex,
  setShowCalendarIndex,
}: DateRangePickerProps) {
  return (
    <Spacing p={2}>
      {[
        {
          label: 'Start',
          dateKey: 'startDate' as const,
          timeKey: 'startTime' as const,
          defaultTime: DEFAULT_START_TIME,
          placeholder: 'Select start date',
        },
        {
          label: 'End',
          dateKey: 'endDate' as const,
          timeKey: 'endTime' as const,
          defaultTime: DEFAULT_END_TIME,
          placeholder: 'Select end date',
        },
      ].map(({ label, dateKey, timeKey, defaultTime, placeholder }, idx) => (
        <Spacing key={label} mb={1}>
          <Text bold default small>
            {label}
          </Text>
          <Spacing mt={1}>
            <div style={{ position: 'relative' }}>
              <TextInput
                afterIcon={dateRange?.[dateKey] ? <Close /> : null}
                afterIconClick={dateRange?.[dateKey]
                  ? () => setFilterState(prev => ({
                    ...prev,
                    [optionKey]: {
                      ...(prev[optionKey] as DateRangeStateType),
                      [dateKey]: null,
                      [timeKey]: defaultTime,
                    },
                  }))
                  : null
                }
                compact
                defaultColor
                onClick={() => setShowCalendarIndex(idx)}
                placeholder={placeholder}
                value={dateRange?.[dateKey]
                  ? utcDateFromDateAndTime(
                      dateRange[dateKey],
                      dateRange[timeKey]?.hour,
                      dateRange[timeKey]?.minute,
                    )
                  : ''
                }
              />
              <ClickOutside
                onClickOutside={() => setShowCalendarIndex(null)}
                open={showCalendarIndex === idx}
                style={{ position: 'relative' }}
              >
                <Calendar
                  selectedDate={dateRange?.[dateKey]}
                  selectedTime={dateRange?.[timeKey]}
                  setSelectedDate={(d) => setFilterState(prev => ({
                    ...prev,
                    [optionKey]: {
                      ...(prev[optionKey] as DateRangeStateType),
                      [dateKey]: d,
                    },
                  }))}
                  setSelectedTime={(t) => setFilterState(prev => {
                    const prevTime = (prev[optionKey] as DateRangeStateType)?.[timeKey];
                    return {
                      ...prev,
                      [optionKey]: {
                        ...(prev[optionKey] as DateRangeStateType),
                        [timeKey]: t(prevTime),
                      },
                    };
                  })}
                />
              </ClickOutside>
            </div>
          </Spacing>
        </Spacing>
      ))}
    </Spacing>
  );
}

type ToggleMenuProps = {
  children: any;
  compact?: boolean;
  onClickCallback: (query?: {
    [key: string]: string | string[] | number | number[];
  }, updatedQuery?: {
    [key: string]: string | string[] | number | number[];
  }) => void;
  onClickOutside: () => void;
  onSecondaryClick: () => void;
  open: boolean;
  options: {
    [keyof: string]: FilterOptionType;
  };
  parentRef: React.RefObject<any>;
  query: { [keyof: string]: string[] };
  resetLimitOnApply?: boolean;
  resetPageOnApply?: boolean;
  setOpen: (open: boolean) => void;
  toggleValueMapping?: {
    [keyof: string]: {
      [keyof: string]: string | (() => string);
    };
  };
};

// TODO: Rename ToggleMenu to FilterMenu since it now supports both toggle and date range filter types.
function ToggleMenu({
  children,
  compact,
  onClickCallback,
  onClickOutside,
  onSecondaryClick,
  open,
  options = {},
  parentRef,
  query,
  resetLimitOnApply,
  resetPageOnApply,
  setOpen,
  toggleValueMapping,
}: ToggleMenuProps) {
  const [highlightedOptionKey, setHighlightedOptionKey] = useState<string>(null);
  const [showCalendarIndex, setShowCalendarIndex] = useState<number>(null);
  const [filterState, setFilterState] = useState<{
    [key: string]: ToggleOptionType | DateRangeStateType;
  }>({});

  useEffect(() => {
    const state: { [key: string]: ToggleOptionType | DateRangeStateType } = {};

    Object.entries(options).forEach(([key, value]) => {
      if (isDateRangeOption(value)) {
        const entry: DateRangeStateType = {
          startDate: null,
          startTime: DEFAULT_START_TIME,
          endDate: null,
          endTime: DEFAULT_END_TIME,
        };
        if (value.startValue) {
          const { date, hour, minute } = getDatePartsFromUnixTimestamp(value.startValue);
          entry.startDate = date;
          entry.startTime = { hour: padTime(hour), minute: padTime(minute) };
        }
        if (value.endValue) {
          const { date, hour, minute } = getDatePartsFromUnixTimestamp(value.endValue);
          entry.endDate = date;
          entry.endTime = { hour: padTime(hour), minute: padTime(minute) };
        }
        state[key] = entry;
      } else {
        state[key] = value as ToggleOptionType;
      }
    });

    setFilterState(state);
  }, [options]);

  const {
    top = 0,
  } = parentRef?.current?.getBoundingClientRect?.() || {};
  const optionKeys = Object.keys(options);
  const highlightedIsDateRange = highlightedOptionKey
    && isDateRangeOption(options[highlightedOptionKey]);
  const currentDateRange = highlightedIsDateRange
    ? filterState[highlightedOptionKey] as DateRangeStateType
    : null;

  const handleApply = () => {
    const updatedQuery = Object.entries(filterState)
      .reduce((acc, [optionKey, stateValue]) => {
        if (!isDateRangeOption(options[optionKey])) {
          const filteredValues = [];
          Object.entries(stateValue as ToggleOptionType)
            .forEach(([value, enabled]) => enabled && filteredValues.push(value));
          acc[optionKey] = filteredValues;
        }

        return acc;
      }, {});

    // Build date range query params (scalar, not array)
    const dateRangeQuery: Record<string, number | null> = {};
    Object.entries(options).forEach(([key, value]) => {
      if (isDateRangeOption(value)) {
        const dr = filterState[key] as DateRangeStateType;
        [
          { dateKey: 'startDate', timeKey: 'startTime', queryKey: 'startKey' },
          { dateKey: 'endDate', timeKey: 'endTime', queryKey: 'endKey' },
        ].forEach(({ dateKey, timeKey, queryKey }) => {
          if (dr?.[dateKey]) {
            const iso = isoDateFormatFromDateParts(
              dr[dateKey], dr[timeKey].hour, dr[timeKey].minute,
            );
            dateRangeQuery[value[queryKey]] = unixTimestampFromDate(iso);
          } else {
            dateRangeQuery[value[queryKey]] = null;
          }
        });
      }
    });

    onClickCallback?.(
      query,
      { ...updatedQuery, ...dateRangeQuery },
    );

    goToWithMixedFilters(query, updatedQuery, dateRangeQuery, {
      itemsPerPage: resetLimitOnApply
        ? (query?.[MetaQueryEnum.LIMIT]
          ? +query[MetaQueryEnum.LIMIT]
          : ROW_LIMIT)
        : undefined,
      pushHistory: true,
      resetLimitParams: resetLimitOnApply,
      resetPage: resetPageOnApply,
    });
  };

  return (
    <ClickOutside
      onClickOutside={onClickOutside}
      open
    >
      <div ref={parentRef}>
        {children}
      </div>
      <ContainerStyle
        allowOverflow={showCalendarIndex !== null}
        compact={compact}
        display={open}
        top={top - 5}
      >
        <MainStyle allowOverflow={showCalendarIndex !== null} compact={compact}>
          <Flex flex="1">
            <BeforeStyle>
              {optionKeys.map(optionKey => (
                <OptionStyle
                  highlighted={highlightedOptionKey === optionKey}
                  key={optionKey}
                  onMouseEnter={() => {
                    setHighlightedOptionKey(optionKey);
                    setShowCalendarIndex(null);
                  }}
                >
                  <Text>
                    {removeUnderscore(capitalize(optionKey))}
                  </Text>
                  <ChevronRight />
                </OptionStyle>
              ))}
            </BeforeStyle>
          </Flex>
          <Flex flex="2">
            <ContentStyle allowOverflow={showCalendarIndex !== null}>
              {highlightedOptionKey && (highlightedIsDateRange
                ? <DateRangePicker
                    dateRange={currentDateRange}
                    optionKey={highlightedOptionKey}
                    setFilterState={setFilterState}
                    setShowCalendarIndex={setShowCalendarIndex}
                    showCalendarIndex={showCalendarIndex}
                  />
                : <ToggleList
                    optionKey={highlightedOptionKey}
                    options={(filterState || options)?.[highlightedOptionKey] as ToggleOptionType}
                    setFilterState={setFilterState}
                    toggleValueMapping={toggleValueMapping?.[highlightedOptionKey]}
                  />
              )}
            </ContentStyle>
          </Flex>
        </MainStyle>
        <Spacing m={1}>
          <FlexContainer>
            <Button onClick={handleApply} secondary>
              Apply
            </Button>
            <Spacing mr={1} />
            <Button
              noBackground
              onClick={() => {
                setFilterState({});
                setOpen(false);
                onSecondaryClick?.();
              }}
            >
              Defaults
            </Button>
          </FlexContainer>
        </Spacing>
      </ContainerStyle>
    </ClickOutside>
  );
}

export default ToggleMenu;
