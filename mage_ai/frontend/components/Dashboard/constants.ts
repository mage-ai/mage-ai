import { CalendarRounded, NavDashboard, Smiley, WeekDots } from '@oracle/icons';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { TIME_PERIOD_DISPLAY_MAPPING, TimePeriodEnum } from '@utils/date';
import { capitalize } from '@utils/string';

export const TAB_TODAY = {
  Icon: Smiley,
  label: () => capitalize(TIME_PERIOD_DISPLAY_MAPPING[TimePeriodEnum.TODAY]),
  uuid: TimePeriodEnum.TODAY,
};
export const TAB_WEEK = {
  Icon: WeekDots,
  label: () => capitalize(TIME_PERIOD_DISPLAY_MAPPING[TimePeriodEnum.WEEK]),
  uuid: TimePeriodEnum.WEEK,
};
export const TAB_MONTH = {
  Icon: CalendarRounded,
  label: () => capitalize(TIME_PERIOD_DISPLAY_MAPPING[TimePeriodEnum.MONTH]),
  uuid: TimePeriodEnum.MONTH,
};

export const TAB_DASHBOARD = {
  Icon: NavDashboard,
  label: () => 'Dashboard',
  uuid: 'Dashboard',
};

export const TIME_PERIOD_TABS: TabType[] = [
  TAB_TODAY,
  TAB_WEEK,
  TAB_MONTH,
];
