import ReactCalendar from 'react-calendar';

import FlexContainer from '@oracle/components/FlexContainer';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { DateSelectionContainer } from '@components/Triggers/Edit/index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { rangeSequential } from '@utils/array';

export type TimeType = {
  hour: string;
  minute: string;
};

type CalendarProps = {
  localTime?: boolean;
  selectedDate: Date;
  selectedTime: TimeType;
  setSelectedDate: (date: Date) => void;
  setSelectedTime: (timeFunc: any) => void;
  topPosition?: boolean;
};

function Calendar({
  localTime,
  selectedDate,
  selectedTime,
  setSelectedDate,
  setSelectedTime,
  topPosition,
}: CalendarProps) {
  return (
    <DateSelectionContainer
      absolute
      topPosition={topPosition}
    >
      <ReactCalendar
        onChange={setSelectedDate}
        value={selectedDate}
      />
      <Spacing mb={2} />
      <FlexContainer alignItems="center">
        <Text default large>
          Time ({localTime ? 'Local' : 'UTC'}):
        </Text>
        <Spacing pr={2} />
        <Select
          compact
          monospace
          onChange={e => {
            e.preventDefault();
            setSelectedTime((prevTime: TimeType) => ({
              ...prevTime,
              hour: e.target.value,
            }));
          }}
          paddingRight={UNIT * 5}
          placeholder="HH"
          value={selectedTime?.hour}
        >
          {rangeSequential(24, 0)
            .map(n => String(n).padStart(2, '0'))
            .map((hour: string) => (
              <option key={`hour_${hour}`} value={hour}>
                {hour}
              </option>
            ))
          }
        </Select>
        <Spacing px={1}>
          <Text bold large>
            :
          </Text>
        </Spacing>
        <Select
          compact
          monospace
          onChange={e => {
            e.preventDefault();
            setSelectedTime((prevTime: TimeType) => ({
              ...prevTime,
              minute: e.target.value,
            }));
          }}
          paddingRight={UNIT * 5}
          placeholder="MM"
          value={selectedTime?.minute}
        >
          {rangeSequential(60, 0)
            .map(n => String(n).padStart(2, '0'))
            .map((minute: string) => (
              <option key={`minute_${minute}`} value={minute}>
                {minute}
              </option>
            ))
          }
        </Select>
      </FlexContainer>
    </DateSelectionContainer>
  );
}

export default Calendar;
