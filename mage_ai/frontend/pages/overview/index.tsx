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
import { TIME_PERIOD_TABS, TAB_DASHBOARD, TAB_TODAY } from '@components/Dashboard/constants';
import { UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
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
  const newPipelineButtonMenuRef = useRef(null);

  const allTabs = useMemo(() => TIME_PERIOD_TABS, []);
  const [selectedTab, setSelectedTabState] = useState<TabType>(
    allTabs.find(
      ({ uuid }) => uuid === (tab ? tab : get(LOCAL_STORAGE_KEY_OVERVIEW_TAB_SELECTED)?.uuid),
    ) || TAB_TODAY,
  );

  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState<boolean>(false);
  const [errors, setErrors] = useState<ErrorsType>(null);

  const timePeriod = selectedTab?.uuid;

  const startDateString = useMemo(
    () => getStartDateStringFromPeriod(timePeriod, { isoString: true }),
    [timePeriod],
  );
  const monitorStatsQueryParams = useMemo(
    () => ({
      group_by_pipeline_type: 1,
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
      include_pipeline_type: 1,
      'order_by[]': 'created_at desc',
      start_timestamp: unixTimestampFromDate(startDateString),
      status: RunStatus.FAILED,
    },
    { ...SHARED_FETCH_OPTIONS },
  );
  const pipelineRunsWithoutDeletedPipelines = useMemo(
    () => (dataPipelineRuns?.pipeline_runs || []).filter(run => run.pipeline_type !== null),
    [dataPipelineRuns?.pipeline_runs],
  );
  const groupedPipelineRuns: {
    [key: string]: PipelineRunType[];
  } = useMemo(
    () => groupBy(pipelineRunsWithoutDeletedPipelines, run => run.pipeline_type),
    [pipelineRunsWithoutDeletedPipelines],
  );
  const {
    integration: integrationPipelineRuns = [],
    python: standardPipelineRuns = [],
    streaming: streamingPipelineRuns = [],
  } = groupedPipelineRuns;

  const dateRange = useMemo(
    () => getDateRange(TIME_PERIOD_INTERVAL_MAPPING[timePeriod] + 1),
    [timePeriod],
  );
  const allPipelineRunData = useMemo(
    () => getAllPipelineRunDataGrouped(monitorStats, dateRange),
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

  const useCreatePipelineMutation = onSuccessCallback =>
    useMutation(api.pipelines.useCreate(), {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: ({ pipeline: { uuid } }) => {
            onSuccessCallback?.(uuid);
          },
          onErrorCallback: (response, errors) =>
            setErrors({
              errors,
              response,
            }),
        }),
    });
  const [createPipeline, { isLoading: isLoadingCreatePipeline }]: [
    MutateFunction<any>,
    { isLoading: boolean },
  ] = useCreatePipelineMutation((pipelineUUID: string) =>
    router.push('/pipelines/[pipeline]/edit', `/pipelines/${pipelineUUID}/edit`),
  );

  const { data: dataProjects, mutate: fetchProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
  const displayLocalTimezone = useMemo(
    () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
    [project?.features],
  );

  const [showCreatePipelineModal, hideCreatePipelineModal] = useModal(
    ({ pipelineType }: { pipelineType: PipelineTypeEnum }) => (
      <ConfigurePipeline
        onClose={hideCreatePipelineModal}
        onSave={({ name, description, tags }) => {
          createPipeline({
            pipeline: {
              description,
              name,
              tags,
              type: pipelineType,
            },
          });
        }}
        pipelineType={pipelineType}
      />
    ),
    {},
    [createPipeline],
    {
      background: true,
      disableEscape: true,
      uuid: 'overview/create_pipeline',
    },
  );

  const [showBrowseTemplates, hideBrowseTemplates] = useModal(
    () => (
      <ErrorProvider>
        <BrowseTemplates
          contained
          onClickCustomTemplate={customTemplate => {
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
    ),
    {},
    [],
    {
      background: true,
      uuid: 'browse_templates',
    },
  );

  const [showImportPipelineModal, hideImportPipelineModal] = useModal(
    () => <UploadPipeline onCancel={hideImportPipelineModal} />,
    {},
    [,],
    {
      background: true,
      uuid: 'import_pipeline',
    },
  );

  const [showConfigureProjectModal, hideConfigureProjectModal] = useModal(
    ({
      cancelButtonText,
      header,
      onCancel,
      onSaveSuccess,
    }: {
      cancelButtonText?: string;
      header?: any;
      onCancel?: () => void;
      onSaveSuccess?: (project: ProjectType) => void;
    }) => (
      <ErrorProvider>
        <Preferences
          cancelButtonText={cancelButtonText}
          contained
          header={
            <Spacing mb={UNITS_BETWEEN_SECTIONS}>
              <Panel>
                <Text warning>
                  You need to add an OpenAI API key to your project before you can generate
                  pipelines using AI.
                </Text>

                <Spacing mt={1}>
                  <Text warning>
                    Read{' '}
                    <Link
                      href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-secret-api-key"
                      openNewWindow
                    >
                      OpenAI’s documentation
                    </Link>{' '}
                    to get your API key.
                  </Text>
                </Spacing>
              </Panel>
            </Spacing>
          }
          onCancel={() => {
            onCancel?.();
            hideConfigureProjectModal();
          }}
          onSaveSuccess={(project: ProjectType) => {
            fetchProjects();
            hideConfigureProjectModal();
            onSaveSuccess?.(project);
          }}
        />
      </ErrorProvider>
    ),
    {},
    [fetchProjects],
    {
      background: true,
      uuid: 'configure_project',
    },
  );

  const [showAIModal, hideAIModal] = useModal(
    () => (
      <ErrorProvider>
        <AIControlPanel
          createPipeline={createPipeline}
          isLoading={isLoadingCreatePipeline}
          onClose={hideAIModal}
        />
      </ErrorProvider>
    ),
    {},
    [createPipeline, isLoadingCreatePipeline],
    {
      background: true,
      disableClickOutside: true,
      disableCloseButton: true,
      uuid: 'AI_modal',
    },
  );

  const newPipelineButtonMenuItems = useMemo(
    () =>
      getNewPipelineButtonMenuItems(createPipeline, {
        showAIModal: () => {
          if (!project?.openai_api_key) {
            showConfigureProjectModal({
              onSaveSuccess: () => {
                showAIModal();
              },
            });
          } else {
            showAIModal();
          }
        },
        showBrowseTemplates,
        showCreatePipelineModal,
        showImportPipelineModal,
      }),
    [
      createPipeline,
      project,
      showAIModal,
      showBrowseTemplates,
      showConfigureProjectModal,
      showCreatePipelineModal,
      showImportPipelineModal,
    ],
  );

  const addButtonEl = useMemo(
    () => (
      <AddButton
        addButtonMenuOpen={addButtonMenuOpen}
        addButtonMenuRef={newPipelineButtonMenuRef}
        isLoading={isLoadingCreatePipeline}
        label="New pipeline"
        menuItems={newPipelineButtonMenuItems}
        onClick={() => setAddButtonMenuOpen(prevOpenState => !prevOpenState)}
        onClickCallback={() => setAddButtonMenuOpen(false)}
      />
    ),
    [addButtonMenuOpen, isLoadingCreatePipeline, newPipelineButtonMenuItems],
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

  const pageBlockLayoutTemplate = useMemo(() => {
    const name0 = 'Pipelines';
    const uuid0 = cleanName(`${name0}_overview_dashboard_${randomSimpleHashGenerator()}`);

    const name1 = 'Trigger active status';
    const uuid1 = cleanName(`${name1}_overview_dashboard_${randomSimpleHashGenerator()}`);

    const name4 = 'Pipeline run status';
    const uuid4 = cleanName(`${name4}_overview_dashboard_${randomSimpleHashGenerator()}`);

    const name5 = 'Pipeline runs daily';
    const uuid5 = cleanName(`${name5}_overview_dashboard_${randomSimpleHashGenerator()}`);

    const name6 = 'Completed pipeline runs daily';
    const uuid6 = cleanName(`${name6}_overview_dashboard_${randomSimpleHashGenerator()}`);

    const name7 = 'Failed pipeline runs daily';
    const uuid7 = cleanName(`${name7}_overview_dashboard_${randomSimpleHashGenerator()}`);

    const name8 = 'Running pipelines';
    const uuid8 = cleanName(`${name8}_overview_dashboard_${randomSimpleHashGenerator()}`);

    const dataSourcePipelineSchedules = {
      type: DataSourceEnum.PIPELINE_SCHEDULES,
    };

    const dataSourcePipelineRuns = {
      type: DataSourceEnum.PIPELINE_RUNS,
    };

    const pipelineRunsPerDayShared = {
      configuration: {
        [VARIABLE_NAME_GROUP_BY]: ['execution_date'],
        [VARIABLE_NAME_METRICS]: [
          {
            aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
            column: 'id',
          },
        ],
        [VARIABLE_NAME_TIME_INTERVAL]: TimeIntervalEnum.DAY,
        chart_type: ChartTypeEnum.TIME_SERIES_LINE_CHART,
      },
      data_source: dataSourcePipelineRuns,
      type: BlockTypeEnum.CHART,
    };

    return {
      blocks: {
        [uuid0]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: ['type'],
            [VARIABLE_NAME_METRICS]: [
              {
                aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
                column: 'uuid',
              },
            ],
            [VARIABLE_NAME_Y_SORT_ORDER]: SortOrderEnum.DESCENDING,
            chart_style: ChartStyleEnum.HORIZONTAL,
            chart_type: ChartTypeEnum.BAR_CHART,
          },
          data_source: {
            type: DataSourceEnum.PIPELINES,
          },
          name: name0,
          type: BlockTypeEnum.CHART,
          uuid: uuid0,
        },
        [uuid1]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: ['status'],
            [VARIABLE_NAME_METRICS]: [
              {
                aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
                column: 'id',
              },
            ],
            [VARIABLE_NAME_Y_SORT_ORDER]: SortOrderEnum.DESCENDING,
            chart_type: ChartTypeEnum.BAR_CHART,
          },
          data_source: dataSourcePipelineSchedules,
          name: name1,
          type: BlockTypeEnum.CHART,
          uuid: uuid1,
        },
        [uuid4]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: ['status'],
            [VARIABLE_NAME_METRICS]: [
              {
                aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
                column: 'id',
              },
            ],
            [VARIABLE_NAME_Y_SORT_ORDER]: SortOrderEnum.DESCENDING,
            chart_style: ChartStyleEnum.HORIZONTAL,
            chart_type: ChartTypeEnum.BAR_CHART,
          },
          data_source: dataSourcePipelineRuns,
          name: name4,
          type: BlockTypeEnum.CHART,
          uuid: uuid4,
        },
        [uuid5]: {
          ...pipelineRunsPerDayShared,
          name: name5,
          uuid: uuid5,
        },
        [uuid6]: {
          ...pipelineRunsPerDayShared,
          content: `
@data_source
def d(df):
    return df[df['status'] == '${RunStatus.COMPLETED}']
`,
          name: name6,
          uuid: uuid6,
        },
        [uuid7]: {
          ...pipelineRunsPerDayShared,
          content: `
@data_source
def d(df):
    return df[df['status'] == '${RunStatus.FAILED}']
`,
          name: name7,
          uuid: uuid7,
        },
        [uuid8]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: [
              'backfill_id',
              'completed_at',
              'created_at',
              'execution_date',
              'executor_type',
              'id',
              'pipeline_schedule_id',
              'pipeline_uuid',
              'started_at',
              'status',
            ],
            chart_type: ChartTypeEnum.TABLE,
          },
          content: `
@data_source
def d(df):
    return df[df['status'] == '${RunStatus.RUNNING}']
`,
          data_source: dataSourcePipelineRuns,
          name: name8,
          type: BlockTypeEnum.CHART,
          uuid: uuid8,
        },
      },
      layout: [
        [
          {
            block_uuid: uuid0,
            width: 1,
          },
          {
            block_uuid: uuid1,
            width: 1,
          },
        ],
        [
          {
            block_uuid: uuid4,
            width: 1,
          },
          {
            block_uuid: uuid5,
            width: 2,
          },
        ],
        [
          {
            block_uuid: uuid6,
            width: 1,
          },
          {
            block_uuid: uuid7,
            width: 1,
          },
        ],
        [
          {
            block_uuid: uuid8,
            width: 1,
          },
        ],
      ],
    };
  }, []);

  return (
    <Dashboard errors={errors} setErrors={setErrors} title="Overview" uuid="overview/index">
      <PageSectionHeader backgroundColor={dark.background.panel} ref={refSubheader}>
        <Spacing py={2}>
          <FlexContainer alignItems="center">
            <Spacing ml={3}>{addButtonEl}</Spacing>
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

      {TAB_DASHBOARD.uuid === selectedTab?.uuid && (
        <BlockLayout
          leftOffset={VERTICAL_NAVIGATION_WIDTH - 1}
          pageBlockLayoutTemplate={pageBlockLayoutTemplate}
          topOffset={HEADER_HEIGHT + refSubheader?.current?.getBoundingClientRect()?.height}
          uuid="overview/dashboard"
        />
      )}

      {TAB_DASHBOARD.uuid !== selectedTab?.uuid && (
        <>
          <Spacing mx={3} my={2}>
            <Headline level={4}>
              {timePeriod === TimePeriodEnum.TODAY &&
                `${capitalize(TimePeriodEnum.TODAY)} (UTC): ${selectedDateRange}`}
              {timePeriod !== TimePeriodEnum.TODAY &&
                `${capitalize(TIME_PERIOD_DISPLAY_MAPPING[timePeriod])} (UTC): ${selectedDateRange}`}
            </Headline>

            <Spacing mt={2}>
              {isValidatingMonitorStats ? (
                <Spacing mx={2} my={11}>
                  <Spinner inverted />
                </Spacing>
              ) : (
                <MetricsSummary pipelineRunCountByPipelineType={pipelineRunCountByPipelineType} />
              )}
            </Spacing>

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
              <Widget pipelineRuns={standardPipelineRuns} pipelineType={PipelineTypeEnum.PYTHON} />
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
        </>
      )}
    </Dashboard>
  );
}

OverviewPage.getInitialProps = async ctx => ({
  tab: ctx?.query?.tab ? (ctx?.query?.tab as TimePeriodEnum) : null,
});

export default PrivateRoute(OverviewPage);
