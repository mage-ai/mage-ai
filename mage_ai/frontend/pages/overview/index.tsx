import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import BarStackChart from '@components/charts/BarStack';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import MetricsSummary from '@components/PipelineRun/MetricsSummary';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';

import {
  BAR_STACK_COLORS,
  BAR_STACK_STATUSES,
  TOOLTIP_LEFT_OFFSET,
} from '@components/Monitor/constants';
import { MonitorStatsEnum, RunCountStatsType } from '@interfaces/MonitorStatsType';
import { TAB_URL_PARAM } from '@oracle/components/Tabs';
import {
  TIME_PERIOD_DISPLAY_MAPPING,
  TIME_PERIOD_INTERVAL_MAPPING,
  TIME_PERIOD_TABS,
  TAB_TODAY,
} from '@components/Dashboard/constants';
import {
  TimePeriodEnum,
  getDateRange,
  getFullDateRangeString,
  getStartDateStringFromPeriod,
} from '@utils/date';
import { capitalize } from '@utils/string';
import { getAllPipelineRunDataGrouped } from '@components/PipelineRun/shared/utils';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';

function OverviewPage() {
  const q = queryFromUrl();
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_TODAY);
  const timePeriod = selectedTab?.uuid;

  const selectedTabPrev = usePrevious(selectedTab);
  useEffect(() => {
    const uuid = q[TAB_URL_PARAM];
    if (uuid) {
      setSelectedTab(TIME_PERIOD_TABS.find(({ uuid: tabUUID }) => tabUUID === uuid));
    }
  }, [
    q,
    selectedTab,
    selectedTabPrev,
  ]);

  const monitorStatsQueryParams = useMemo(() => ({
    group_by_pipeline_type: 1,
    start_time: getStartDateStringFromPeriod(timePeriod, { isoString: true }),
  }), [timePeriod]);
  const {
    data: dataMonitor,
    isValidating: isValidatingMonitorStats,
    mutate: fetchMonitorStats,
  } = api.monitor_stats.detail(
    MonitorStatsEnum.PIPELINE_RUN_COUNT,
    monitorStatsQueryParams,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (selectedTabPrev && selectedTab?.uuid !== selectedTabPrev?.uuid) {
      fetchMonitorStats();
    }
  }, [fetchMonitorStats, selectedTab, selectedTabPrev]);

  const dateRange = useMemo(() =>
    getDateRange(TIME_PERIOD_INTERVAL_MAPPING[timePeriod] + 1),
    [timePeriod],
    );
  const allPipelineRunData = useMemo(() => {
    const monitorStats: RunCountStatsType = dataMonitor?.monitor_stat?.stats || {};
    return getAllPipelineRunDataGrouped(monitorStats, dateRange);
  }, [
    dataMonitor?.monitor_stat?.stats,
    dateRange,
  ]);
  const selectedDateRange = useMemo(() =>
    getFullDateRangeString(
      TIME_PERIOD_INTERVAL_MAPPING[timePeriod],
      { endDateOnly: timePeriod === TimePeriodEnum.TODAY },
    ),
    [timePeriod],
  );

  return (
    <Dashboard
      title="Overview"
      uuid="overview/index"
    >
      <PageSectionHeader backgroundColor={dark.background.panel}>
        <Spacing py={2}>
          <ButtonTabs
            onClickTab={({ uuid }) => {
              goToWithQuery({ [TAB_URL_PARAM]: uuid }, { replaceParams: true });
            }}
            selectedTabUUID={timePeriod}
            tabs={TIME_PERIOD_TABS}
          />
        </Spacing>
      </PageSectionHeader>

      <Spacing mx={3} my={2}>
        <Headline level={4}>
          {timePeriod === TimePeriodEnum.TODAY &&
            `${capitalize(TimePeriodEnum.TODAY)} (UTC time): ${selectedDateRange}`}
          {timePeriod !== TimePeriodEnum.TODAY &&
            `${capitalize(TIME_PERIOD_DISPLAY_MAPPING[timePeriod])} (UTC time): ${selectedDateRange}`}
        </Headline>

        <Spacing mt={2}>
          {isValidatingMonitorStats
            ? (
              <Spacing mx={2} my={11}>
                <Spinner inverted />
              </Spacing>
            ) : (
              <MetricsSummary
                pipelineRunCountByPipelineType={allPipelineRunData.pipelineRunCountByPipelineType}
              />
            )
          }
        </Spacing>

        <Spacing mt={2}>
          <Spacing ml={1}>
            <Text bold large>
              {allPipelineRunData.totalPipelineRunCount} total pipeline runs for {TIME_PERIOD_DISPLAY_MAPPING[timePeriod]}
            </Text>
          </Spacing>
          <Spacing mt={1}>
            <BarStackChart
              colors={BAR_STACK_COLORS}
              data={allPipelineRunData.ungroupedPipelineRunData}
              getXValue={(data) => data['date']}
              height={200}
              keys={BAR_STACK_STATUSES}
              margin={{
                bottom: 30,
                left: 35,
                right: 0,
                top: 10,
              }}
              tooltipLeftOffset={TOOLTIP_LEFT_OFFSET}
              xLabelFormat={label => moment(label).format('MMM DD')}
            />
          </Spacing>
        </Spacing>
      </Spacing>
    </Dashboard>
  );
}

OverviewPage.getInitialProps = async () => ({});

export default PrivateRoute(OverviewPage);
