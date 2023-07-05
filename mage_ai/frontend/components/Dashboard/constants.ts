import { CalendarRounded, Smiley, WeekDots } from '@oracle/icons';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { TimePeriodEnum } from '@utils/date';
import { capitalize } from '@utils/string';

export const TIME_PERIOD_DISPLAY_MAPPING = {
  [TimePeriodEnum.TODAY]: 'today',
  [TimePeriodEnum.WEEK]: 'last 7 days',
  [TimePeriodEnum.MONTH]: 'last 30 days',
};

export const TIME_PERIOD_INTERVAL_MAPPING = {
  [TimePeriodEnum.TODAY]: 0,
  [TimePeriodEnum.WEEK]: 7,
  [TimePeriodEnum.MONTH]: 30,
};

export const TAB_TODAY = {
  Icon: Smiley,
  label: () => capitalize(TimePeriodEnum.TODAY),
  uuid: TimePeriodEnum.TODAY,
};
export const TAB_WEEK = {
  Icon: WeekDots,
  label: () => capitalize(TimePeriodEnum.WEEK),
  uuid: TimePeriodEnum.WEEK,
};
export const TAB_MONTH = {
  Icon: CalendarRounded,
  label: () => capitalize(TimePeriodEnum.MONTH),
  uuid: TimePeriodEnum.MONTH,
};

export const TIME_PERIOD_TABS: TabType[] = [
  TAB_TODAY,
  TAB_WEEK,
  TAB_MONTH,
];
