import { useEffect, useMemo, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import MetricsSummary from '@components/PipelineRun/MetricsSummary';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';

import Headline from '@oracle/elements/Headline';
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
    start_time: getStartDateStringFromPeriod(timePeriod, true),
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

  const dateRange = useMemo(() => getDateRange(TIME_PERIOD_INTERVAL_MAPPING[timePeriod]), [
    timePeriod,
  ]);
  const allPipelineRunDataGrouped = useMemo(() => {
    const monitorStats: RunCountStatsType = dataMonitor?.monitor_stat?.stats || {};
    return getAllPipelineRunDataGrouped(monitorStats, dateRange);
  }, [
    dataMonitor?.monitor_stat?.stats,
    dateRange,
  ]);
  const longDateToday = useMemo(() => new Date().toLocaleDateString(
    'en-us', 
    { day: 'numeric', month: 'long', year: 'numeric' },
  ), []);

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

      <Spacing m={3}>
        <Headline level={5}>
          {timePeriod === TimePeriodEnum.TODAY && `${capitalize(TimePeriodEnum.TODAY)}. ${longDateToday}`}
          {timePeriod !== TimePeriodEnum.TODAY &&
            `${capitalize(TIME_PERIOD_DISPLAY_MAPPING[timePeriod])} up to today, ${longDateToday}`
          }
        </Headline>

        <Spacing mt={3}>
          {isValidatingMonitorStats 
            ? (
              <Spacing mx={2} my={10}>
                <Spinner inverted />
              </Spacing>
            ) : (
              <MetricsSummary
                pipelineRunCountByPipelineType={allPipelineRunDataGrouped.pipelineRunCountByPipelineType}
              />
            )
          }
        </Spacing>
      </Spacing>
    </Dashboard>
  );
}

OverviewPage.getInitialProps = async () => ({});

export default PrivateRoute(OverviewPage);
