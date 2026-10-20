import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import moment from 'moment';

import BarStackChart from '@components/charts/BarStack';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import Widget from '@components/PipelineRun/Widget';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { ALL_PIPELINE_RUNS_TYPE } from '@interfaces/PipelineType';
import {
  BAR_STACK_COLORS,
  BAR_STACK_STATUSES,
  TOOLTIP_LEFT_OFFSET,
} from '@components/Monitor/constants';
import { LOCAL_STORAGE_KEY_OVERVIEW_TAB_SELECTED, set, get } from 'storage/localStorage';
import { MonitorStatsEnum } from '@interfaces/MonitorStatsType';
import { RunStatus } from '@interfaces/BlockRunType';
import { SHARED_UTC_TOOLTIP_PROPS } from '@components/PipelineRun/shared/constants';
import { TAB_URL_PARAM } from '@oracle/components/Tabs';
import {
  TIME_PERIOD_DISPLAY_MAPPING,
  TIME_PERIOD_INTERVAL_MAPPING,
  TimePeriodEnum,
  getDateRange,
  getFullDateRangeString,
  getStartDateStringFromPeriod,
  unixTimestampFromDate,
} from '@utils/date';
import { TIME_PERIOD_TABS, TAB_TODAY } from '@components/Dashboard/constants';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import { capitalize } from '@utils/string';
import { formatNumber } from '@utils/number';
import { getAllPipelineRunDataGrouped } from '@components/PipelineRun/shared/utils';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';

const SHARED_WIDGET_SPACING_PROPS = {
  mt: 2,
  mx: 3,
};
const SHARED_FETCH_OPTIONS = {
  refreshInterval: 60000,
  revalidateOnFocus: false,
};

function OverviewPage({ tab }: { tab?: TimePeriodEnum }) {
  const abortRef = useRef(null);
  const mountedRef = useRef(false);
  const refSubheader = useRef(null);

  const allTabs = useMemo(() => TIME_PERIOD_TABS, []);
  const [selectedTab, setSelectedTabState] = useState<TabType>(
    allTabs.find(
      ({ uuid }) => uuid === (tab ? tab : get(LOCAL_STORAGE_KEY_OVERVIEW_TAB_SELECTED)?.uuid),
    ) || TAB_TODAY,
  );

  const [errors, setErrors] = useState<ErrorsType>(null);

  const timePeriod = selectedTab?.uuid;

  const startDateString = useMemo(
    () => getStartDateStringFromPeriod(timePeriod, { isoString: true }),
    [timePeriod],
  );
  const monitorStatsQueryParams = useMemo(
    () => ({
      start_time: startDateString,
    }),
    [startDateString],
  );

  const [monitorStats, setMonitorStats] = useState();
  const [fetchMonitorStats, { isLoading: isValidatingMonitorStats }] = useMutation(
    () =>
      api.monitor_stats?.detailAsync(MonitorStatsEnum.PIPELINE_RUN_COUNT, monitorStatsQueryParams, {
        signal: abortRef?.current?.signal,
      }),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: ({ monitor_stat: { stats } }) => {
            setMonitorStats(stats);
          },
        }),
    },
  );

  const setSelectedTab = useCallback(
    (prev: TabType | ((tab: TabType) => TabType)) => {
      if (abortRef?.current !== null) {
        abortRef?.current?.abort();
      }
      abortRef.current = new AbortController();

      setSelectedTabState((current: TabType) => {
        const tab = typeof prev === 'function' ? prev(current) : prev;

        if (current?.uuid !== tab?.uuid) {
          goToWithQuery({ [TAB_URL_PARAM]: tab?.uuid }, { replaceParams: true });

          fetchMonitorStats();
        }

        set(LOCAL_STORAGE_KEY_OVERVIEW_TAB_SELECTED, tab);

        return tab;
      });
    },
    [fetchMonitorStats],
  );

  useEffect(() => {
    if (!mountedRef?.current) {
      mountedRef.current = true;
      fetchMonitorStats();
    }

    if (!tab) {
      goToWithQuery(
        {
          [TAB_URL_PARAM]: selectedTab ? selectedTab?.uuid : allTabs?.[0]?.uuid,
        },
        {
          pushHistory: false,
        },
      );
    }
  }, [allTabs, fetchMonitorStats, selectedTab, tab]);

  const { data: dataPipelineRuns } = api.pipeline_runs.list(
    {
      _limit: 50,
      include_all_pipeline_schedules: true,
      'order_by[]': 'created_at desc',
      start_timestamp: unixTimestampFromDate(startDateString),
      status: RunStatus.FAILED,
    },
    { ...SHARED_FETCH_OPTIONS },
  );
  const pipelineRuns = useMemo(
    () => (dataPipelineRuns?.pipeline_runs || []),
    [dataPipelineRuns?.pipeline_runs],
  );

  const dateRange = useMemo(
    () => getDateRange(TIME_PERIOD_INTERVAL_MAPPING[timePeriod] + 1),
    [timePeriod],
  );
  const allPipelineRunData = useMemo(
    () => getAllPipelineRunDataGrouped(monitorStats, dateRange, true),
    [monitorStats, dateRange],
  );
  const { totalPipelineRunCount, ungroupedPipelineRunData } =
    allPipelineRunData;

  const selectedDateRange = useMemo(
    () =>
      getFullDateRangeString(TIME_PERIOD_INTERVAL_MAPPING[timePeriod], {
        endDateOnly: timePeriod === TimePeriodEnum.TODAY,
      }),
    [timePeriod],
  );

  const { data: dataProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
  const displayLocalTimezone = useMemo(
    () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
    [project?.features],
  );

  const utcTooltipEl = useMemo(
    () =>
      displayLocalTimezone ? (
        <Spacing ml="4px">
          <Tooltip
            {...SHARED_UTC_TOOLTIP_PROPS}
            label="Please note that these counts are based on UTC time."
          />
        </Spacing>
      ) : null,
    [displayLocalTimezone],
  );

  return (
    <WorkspacesDashboard
      breadcrumbs={[
        {
          label: () => 'Workspaces',
          linkProps: {
            as: '/manage',
            href: '/manage',
          },
        },
        {
          bold: true,
          label: () => 'Overview',
        },
      ]}
      errors={errors}
      pageName={WorkspacesPageNameEnum.OVERVIEW}
      setErrors={setErrors}
    >
      <PageSectionHeader backgroundColor={dark.background.panel} ref={refSubheader}>
        <Spacing py={2}>
          <FlexContainer alignItems="center">
            <ButtonTabs
              onClickTab={({ uuid }) => {
                setSelectedTab(() => allTabs.find(t => uuid === t.uuid));
              }}
              regularSizeText
              selectedTabUUID={timePeriod}
              tabs={allTabs}
            />
          </FlexContainer>
        </Spacing>
      </PageSectionHeader>

      <Spacing mx={3} my={2}>
        <Headline level={4}>
          {timePeriod === TimePeriodEnum.TODAY &&
            `${capitalize(TimePeriodEnum.TODAY)} (UTC): ${selectedDateRange}`}
          {timePeriod !== TimePeriodEnum.TODAY &&
            `${capitalize(TIME_PERIOD_DISPLAY_MAPPING[timePeriod])} (UTC): ${selectedDateRange}`}
        </Headline>

        <Spacing mt={2}>
          <Spacing ml={2}>
            <FlexContainer alignItems="center">
              <Text bold large>
                {isValidatingMonitorStats ? '--' : formatNumber(totalPipelineRunCount)} total
                pipeline runs
              </Text>
              {utcTooltipEl}
            </FlexContainer>
          </Spacing>
          <Spacing mt={1}>
            <BarStackChart
              backgroundColor={dark.background.panel}
              colors={BAR_STACK_COLORS}
              data={ungroupedPipelineRunData}
              getXValue={data => data['date']}
              height={500}
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

      <Spacing {...SHARED_WIDGET_SPACING_PROPS}>
        <FlexContainer alignItems="center" justifyContent="center">
          <Widget
            pipelineRuns={pipelineRuns}
            pipelineType={ALL_PIPELINE_RUNS_TYPE}
            workspaceFormatting
          />
        </FlexContainer>
      </Spacing>

      <Spacing mb={2} />
    </WorkspacesDashboard>
  );
}

OverviewPage.getInitialProps = async ctx => ({
  tab: ctx?.query?.tab ? (ctx?.query?.tab as TimePeriodEnum) : null,
});

export default PrivateRoute(OverviewPage);
