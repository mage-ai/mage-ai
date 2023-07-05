import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import BarStackChart from '@components/charts/BarStack';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import MetricsSummary from '@components/PipelineRun/MetricsSummary';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import PipelineRunType from '@interfaces/PipelineRunType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Widget from '@components/PipelineRun/Widget';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';

import { ALL_PIPELINE_RUNS_TYPE, PipelineTypeEnum } from '@interfaces/PipelineType';
import {
  BAR_STACK_COLORS,
  BAR_STACK_STATUSES,
  TOOLTIP_LEFT_OFFSET,
} from '@components/Monitor/constants';
import { MonitorStatsEnum, RunCountStatsType } from '@interfaces/MonitorStatsType';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
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
  unixTimestampFromDate,
} from '@utils/date';
import { capitalize } from '@utils/string';
import { getAllPipelineRunDataGrouped } from '@components/PipelineRun/shared/utils';
import { goToWithQuery } from '@utils/routing';
import { groupBy } from '@utils/array';
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

  const startDateString = useMemo(() =>
    getStartDateStringFromPeriod(timePeriod, { isoString: true }),
    [timePeriod],
  );
  const monitorStatsQueryParams = useMemo(() => ({
    group_by_pipeline_type: 1,
    start_time: startDateString,
  }), [startDateString]);
  const {
    data: dataMonitor,
    isValidating: isValidatingMonitorStats,
    mutate: fetchMonitorStats,
  } = api.monitor_stats.detail(
    MonitorStatsEnum.PIPELINE_RUN_COUNT,
    monitorStatsQueryParams,
    { revalidateOnFocus: false },
  );

  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.list(
    {
      _limit: 50,
      include_pipeline_type: 1,
      'order_by[]': 'created_at desc',
      start_timestamp: unixTimestampFromDate(startDateString),
      status: RunStatusEnum.FAILED,
    },
  );
  const groupedPipelineRuns: {
    [key: string]:  PipelineRunType[],
  } = useMemo(() => groupBy(dataPipelineRuns?.pipeline_runs || [], run => run.pipeline_type), [
    dataPipelineRuns?.pipeline_runs,
  ]);
  const {
    integration: integrationPipelineRuns = [],
    python: standardPipelineRuns = [],
    streaming: streamingPipelineRuns = [],
  } = groupedPipelineRuns;

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
          <Spacing ml={2}>
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

      <Spacing mt={2} mx={2}>
        <FlexContainer alignItems="center" justifyContent="center">
          <Widget
            pipelineRuns={dataPipelineRuns?.pipeline_runs || []}
            pipelineType={ALL_PIPELINE_RUNS_TYPE}
          />
          <Spacing ml={2} />
          <Widget
            pipelineRuns={standardPipelineRuns}
            pipelineType={PipelineTypeEnum.PYTHON}
          />
        </FlexContainer>
      </Spacing>

      <Spacing mt={2} mx={2}>
        <FlexContainer alignItems="center" justifyContent="center">
          <Widget
            pipelineRuns={integrationPipelineRuns}
            pipelineType={PipelineTypeEnum.INTEGRATION}
          />
          <Spacing ml={2} />
          <Widget
            pipelineRuns={streamingPipelineRuns}
            pipelineType={PipelineTypeEnum.STREAMING}
          />
        </FlexContainer>
      </Spacing>

      <Spacing mb={2} />
    </Dashboard>
  );
}

OverviewPage.getInitialProps = async () => ({});

export default PrivateRoute(OverviewPage);
