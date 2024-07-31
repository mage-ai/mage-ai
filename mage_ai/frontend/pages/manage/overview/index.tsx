import { MutateFunction, useMutation } from 'react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import moment from 'moment';

import AIControlPanel from '@components/AI/ControlPanel';
import AddButton from '@components/shared/AddButton';
import BarStackChart from '@components/charts/BarStack';
import BlockLayout from '@components/BlockLayout';
import BrowseTemplates from '@components/CustomTemplates/BrowseTemplates';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import ConfigurePipeline from '@components/PipelineDetail/ConfigurePipeline';
import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import MetricsSummary from '@components/PipelineRun/MetricsSummary';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import Panel from '@oracle/components/Panel';
import PipelineRunType from '@interfaces/PipelineRunType';
import Preferences from '@components/settings/workspace/Preferences';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import Widget from '@components/PipelineRun/Widget';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import {
  AggregationFunctionEnum,
  ChartStyleEnum,
  ChartTypeEnum,
  SortOrderEnum,
  TimeIntervalEnum,
  VARIABLE_NAME_GROUP_BY,
  VARIABLE_NAME_METRICS,
  VARIABLE_NAME_TIME_INTERVAL,
  VARIABLE_NAME_Y_SORT_ORDER,
} from '@interfaces/ChartBlockType';
import { ALL_PIPELINE_RUNS_TYPE, PipelineTypeEnum } from '@interfaces/PipelineType';
import {
  BAR_STACK_COLORS,
  BAR_STACK_STATUSES,
  TOOLTIP_LEFT_OFFSET,
} from '@components/Monitor/constants';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { DataSourceEnum } from '@interfaces/BlockLayoutItemType';
import { ErrorProvider } from '@context/Error';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { MonitorStatsEnum } from '@interfaces/MonitorStatsType';
import { NAV_TAB_PIPELINES } from '@components/CustomTemplates/BrowseTemplates/constants';
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
import { UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import {
  capitalize,
  cleanName,
  randomSimpleHashGenerator,
  randomNameGenerator,
} from '@utils/string';
import { formatNumber } from '@utils/number';
import { getAllPipelineRunDataGrouped } from '@components/PipelineRun/shared/utils';
import { getNewPipelineButtonMenuItems } from '@components/Dashboard/utils';
import { goToWithQuery } from '@utils/routing';
import { groupBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';
import { useModal } from '@context/Modal';
import UploadPipeline from '@components/PipelineDetail/UploadPipeline';
import { LOCAL_STORAGE_KEY_OVERVIEW_TAB_SELECTED, set, get } from 'storage/localStorage';

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

  const q = queryFromUrl();
  const router = useRouter();

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
  const { pipelineRunCountByPipelineType, totalPipelineRunCount, ungroupedPipelineRunData } =
    allPipelineRunData;

  const selectedDateRange = useMemo(
    () =>
      getFullDateRangeString(TIME_PERIOD_INTERVAL_MAPPING[timePeriod], {
        endDateOnly: timePeriod === TimePeriodEnum.TODAY,
      }),
    [timePeriod],
  );

  const { data: dataProjects, mutate: fetchProjects } = api.projects.list();
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
