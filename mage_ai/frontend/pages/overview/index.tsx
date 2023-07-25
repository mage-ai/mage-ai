import { MutateFunction, useMutation } from 'react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import moment from 'moment';

import AddButton from '@components/shared/AddButton';
import BarStackChart from '@components/charts/BarStack';
import BrowseTemplates from '@components/CustomTemplates/BrowseTemplates';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
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
import { ErrorProvider } from '@context/Error';
import { MonitorStatsEnum, RunCountStatsType } from '@interfaces/MonitorStatsType';
import { NAV_TAB_PIPELINES } from '@components/CustomTemplates/BrowseTemplates/constants';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
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
import {
  TIME_PERIOD_TABS,
  TAB_TODAY,
} from '@components/Dashboard/constants';
import { capitalize, randomNameGenerator } from '@utils/string';
import { getAllPipelineRunDataGrouped } from '@components/PipelineRun/shared/utils';
import { getNewPipelineButtonMenuItems } from '@components/Dashboard/utils';
import { goToWithQuery } from '@utils/routing';
import { groupBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { useModal } from '@context/Modal';

const SHARED_WIDGET_SPACING_PROPS = {
  mt: 2,
  mx: 3,
};
const SHARED_FETCH_OPTIONS = {
  refreshInterval: 60000,
  revalidateOnFocus: false,
};

function OverviewPage() {
  const q = queryFromUrl();
  const router = useRouter();
  const newPipelineButtonMenuRef = useRef(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_TODAY);
  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState<boolean>(false);
  const [errors, setErrors] = useState<ErrorsType>(null);

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
    { ...SHARED_FETCH_OPTIONS },
  );

  const {
    data: dataPipelineRuns,
  } = api.pipeline_runs.list(
    {
      _limit: 50,
      include_pipeline_type: 1,
      'order_by[]': 'created_at desc',
      start_timestamp: unixTimestampFromDate(startDateString),
      status: RunStatusEnum.FAILED,
    },
    { ...SHARED_FETCH_OPTIONS },
  );
  const pipelineRunsWithoutDeletedPipelines = useMemo(() =>
    (dataPipelineRuns?.pipeline_runs || [])
      .filter(run => run.pipeline_type !== null)
  , [dataPipelineRuns?.pipeline_runs]);
  const groupedPipelineRuns: {
    [key: string]:  PipelineRunType[],
  } = useMemo(() => groupBy(pipelineRunsWithoutDeletedPipelines, run => run.pipeline_type), [
    pipelineRunsWithoutDeletedPipelines,
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
  const {
    pipelineRunCountByPipelineType,
    totalPipelineRunCount,
    ungroupedPipelineRunData,
  } = allPipelineRunData;
  const selectedDateRange = useMemo(() =>
    getFullDateRangeString(
      TIME_PERIOD_INTERVAL_MAPPING[timePeriod],
      { endDateOnly: timePeriod === TimePeriodEnum.TODAY },
    ),
    [timePeriod],
  );

  const useCreatePipelineMutation = (onSuccessCallback) => useMutation(
    api.pipelines.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            onSuccessCallback?.(uuid);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const [createPipeline, { isLoading: isLoadingCreatePipeline }]: [
    MutateFunction<any>,
    { isLoading: boolean },
  ] = useCreatePipelineMutation((pipelineUUID: string) => router.push(
    '/pipelines/[pipeline]/edit',
    `/pipelines/${pipelineUUID}/edit`,
  ));

  const [showBrowseTemplates, hideBrowseTemplates] = useModal(() => (
    <ErrorProvider>
      <BrowseTemplates
        contained
        onClickCustomTemplate={(customTemplate) => {
          createPipeline({
            pipeline: {
              custom_template_uuid: customTemplate?.template_uuid,
              name: randomNameGenerator(),
            },
          }).then(() => {
            hideBrowseTemplates();
          });
        }}
        showBreadcrumbs
        tabs={[NAV_TAB_PIPELINES]}
      />
    </ErrorProvider>
  ), {
  }, [
  ], {
    background: true,
    uuid: 'browse_templates',
  });

  const newPipelineButtonMenuItems = useMemo(() => getNewPipelineButtonMenuItems(
    createPipeline,
    {
      showBrowseTemplates,
    },
  ), [
    createPipeline,
    showBrowseTemplates,
  ]);
  const addButtonEl = useMemo(() => (
    <AddButton
      addButtonMenuOpen={addButtonMenuOpen}
      addButtonMenuRef={newPipelineButtonMenuRef}
      isLoading={isLoadingCreatePipeline}
      label="New pipeline"
      menuItems={newPipelineButtonMenuItems}
      onClick={() => setAddButtonMenuOpen(prevOpenState => !prevOpenState)}
      onClickCallback={() => setAddButtonMenuOpen(false)}
    />
  ), [addButtonMenuOpen, isLoadingCreatePipeline, newPipelineButtonMenuItems]);

  return (
    <Dashboard
      errors={errors}
      setErrors={setErrors}
      title="Overview"
      uuid="overview/index"
    >
      <PageSectionHeader backgroundColor={dark.background.panel}>
        <Spacing py={2}>
          <FlexContainer alignItems="center">
            <Spacing ml={3}>
              {addButtonEl}
            </Spacing>
            <ButtonTabs
              onClickTab={({ uuid }) => {
                goToWithQuery({ [TAB_URL_PARAM]: uuid }, { replaceParams: true });
              }}
              regularSizeText
              selectedTabUUID={timePeriod}
              tabs={TIME_PERIOD_TABS}
            />
          </FlexContainer>
        </Spacing>
      </PageSectionHeader>

      <Spacing mx={3} my={2}>
        <Headline level={4}>
          {timePeriod === TimePeriodEnum.TODAY &&
            `${capitalize(TimePeriodEnum.TODAY)}: ${selectedDateRange}`}
          {timePeriod !== TimePeriodEnum.TODAY &&
            `${capitalize(TIME_PERIOD_DISPLAY_MAPPING[timePeriod])}: ${selectedDateRange}`}
        </Headline>

        <Spacing mt={2}>
          {isValidatingMonitorStats
            ? (
              <Spacing mx={2} my={11}>
                <Spinner inverted />
              </Spacing>
            ) : (
              <MetricsSummary
                pipelineRunCountByPipelineType={pipelineRunCountByPipelineType}
              />
            )
          }
        </Spacing>

        <Spacing mt={2}>
          <Spacing ml={2}>
            <Text bold large>
              {isValidatingMonitorStats ? '--' : totalPipelineRunCount} total pipeline runs
            </Text>
          </Spacing>
          <Spacing mt={1}>
            <BarStackChart
              backgroundColor={dark.background.panel}
              colors={BAR_STACK_COLORS}
              data={ungroupedPipelineRunData}
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

      <Spacing {...SHARED_WIDGET_SPACING_PROPS}>
        <FlexContainer alignItems="center" justifyContent="center">
          <Widget
            pipelineRuns={pipelineRunsWithoutDeletedPipelines}
            pipelineType={ALL_PIPELINE_RUNS_TYPE}
          />
          <Spacing ml={2} />
          <Widget
            pipelineRuns={standardPipelineRuns}
            pipelineType={PipelineTypeEnum.PYTHON}
          />
        </FlexContainer>
      </Spacing>

      <Spacing {...SHARED_WIDGET_SPACING_PROPS}>
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
