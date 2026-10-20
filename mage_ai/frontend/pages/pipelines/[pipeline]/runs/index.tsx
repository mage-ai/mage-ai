import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BlocksSeparatedGradient from '@oracle/icons/custom/BlocksSeparatedGradient';
import BlockRunsTable, {
  COL_IDX_TO_BLOCK_RUN_ATTR_MAPPING,
  DEFAULT_SORTABLE_BR_COL_INDEXES,
} from '@components/PipelineDetail/BlockRuns/Table';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import ClickOutside from '@oracle/components/ClickOutside';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import Paginate, { MAX_PAGES, ROW_LIMIT } from '@components/shared/Paginate';
import PipeIconGradient from '@oracle/icons/custom/PipeIconGradient';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType, {
  PIPELINE_RUN_STATUSES,
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
  RUNNING_STATUSES,
} from '@interfaces/PipelineRunType';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PopupMenu from '@oracle/components/PopupMenu';
import PrivateRoute from '@components/shared/PrivateRoute';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import buildTableSidekick, {
  TABS as TABS_SIDEKICK,
} from '@components/PipelineRun/shared/buildTableSidekick';
import usePrevious from '@utils/usePrevious';
import {
  AlertTriangle,
  ArrowDown,
  BlocksSeparated,
  Close,
  PipeIcon,
  Refresh,
} from '@oracle/icons';
import {
  CANCEL_ALL_RUNNING_PIPELINE_RUNS_UUID,
  PageNameEnum,
} from '@components/PipelineDetailPage/constants';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { MetaQueryEnum } from '@api/constants';
import { PipelineStatusEnum, PipelineTypeEnum } from '@interfaces/PipelineType';
import { POPUP_MENU_WIDTH, SEARCH_INPUT_PROPS } from '@components/shared/Table/Toolbar/constants';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
import { SortDirectionEnum, SortQueryEnum } from '@components/shared/Table/constants';
import { TAB_URL_PARAM } from '@oracle/components/Tabs';
import { UNIT } from '@oracle/styles/units/spacing';
import { VerticalDividerStyle } from '@oracle/elements/Divider/index.style';
import { displayErrorFromReadResponse, onSuccess } from '@api/utils/response';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEqual } from '@utils/hash';
import { queryFromUrl, queryString } from '@utils/url';

const TAB_PIPELINE_RUNS = {
  Icon: PipeIcon,
  IconSelected: PipeIconGradient,
  label: () => 'Pipeline runs',
  uuid: 'pipeline_runs',
};
const TAB_BLOCK_RUNS = {
  Icon: BlocksSeparated,
  IconSelected: BlocksSeparatedGradient,
  label: () => 'Block runs',
  uuid: 'block_runs',
};
const TABS = [
  TAB_PIPELINE_RUNS,
  TAB_BLOCK_RUNS,
];


type PipelineRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineRuns({
  pipeline: pipelineProp,
}: PipelineRunsProp) {
  const router = useRouter();
  const refActionsMenu = useRef(null);
  const variableSearchInputRef = useRef(null);

  const [errors, setErrors] = useState<ErrorsType>(null);
  const [blockRunErrors, setBlockRunErrors] = useState<ErrorsType>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_PIPELINE_RUNS);
  const [selectedTabSidekick, setSelectedTabSidekick] = useState<TabType>(TABS_SIDEKICK[0]);
  const [selectedRun, setSelectedRun] = useState<PipelineRunType>(null);
  const [selectedRuns, setSelectedRuns] = useState<{ [keyof: string]: PipelineRunType }>({});
  const [variableSearchText, setVariableSearchText] = useState<string>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);
  const [confirmationDialogueOpenId, setConfirmationDialogueOpenId] = useState<string>(null);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [query, setQuery] = useState<{
    offset?: number;
    pipeline_run_id?: number;
    pipeline_uuid?: string;
    status?: RunStatusEnum;
  }>(null);

  const isPipelineRunsTab = useMemo(
    () => TAB_PIPELINE_RUNS.uuid === selectedTab?.uuid,
    [selectedTab?.uuid],
  );

  const pipelineUUID = pipelineProp.uuid;
  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID, {
    includes_content: false,
    includes_outputs: false,
  }, {
    revalidateOnFocus: false,
  });
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);

  const q = queryFromUrl();
  const qPrev = usePrevious(q);
  const page = q?.page ? q.page : 0;
  useEffect(() => {
    const {
      pipeline_run_id: pipelineRunId,
      status: pipelineRunStatus,
    } = q;

    if (!isEqual(q, qPrev)) {
      const newQuery = { ...qPrev, ...q };

      if (pipelineRunId) {
        newQuery.pipeline_run_id = pipelineRunId;
      } else {
        newQuery.pipeline_uuid = pipelineUUID;
      }

      if (pipelineRunStatus) {
        newQuery.status = pipelineRunStatus;
      } else {
        delete newQuery.status;
      }

      setQuery(newQuery);
      setSelectedRuns({});
    }
  }, [
    pipelineUUID,
    q,
    qPrev,
  ]);

  const runsRequestQuery: PipelineRunReqQueryParamsType = {
    _limit: ROW_LIMIT,
    _offset: page * ROW_LIMIT,
    pipeline_uuid: pipelineUUID,
  };
  let blockRunsRequestQuery = ignoreKeys(
    { ...query, ...runsRequestQuery },
    [TAB_URL_PARAM, 'page', SortQueryEnum.SORT_COL_IDX, SortQueryEnum.SORT_DIRECTION],
  );
  if (isPipelineRunsTab) {
    blockRunsRequestQuery = ignoreKeys(blockRunsRequestQuery, [MetaQueryEnum.OFFSET, 'status']);
  }
  const sortColumnIndexQuery = q?.[SortQueryEnum.SORT_COL_IDX];
  const sortDirectionQuery = q?.[SortQueryEnum.SORT_DIRECTION];
  if (sortColumnIndexQuery) {
    const blockRunSortColumn = COL_IDX_TO_BLOCK_RUN_ATTR_MAPPING[sortColumnIndexQuery];
    const sortDirection = sortDirectionQuery || SortDirectionEnum.ASC;
    blockRunsRequestQuery.order_by = `${blockRunSortColumn}%20${sortDirection}`;
  }
  const { data: dataBlockRuns } = api.block_runs.list(
    blockRunsRequestQuery,
    {},
  );
  useEffect(() => {
    displayErrorFromReadResponse(dataBlockRuns, setBlockRunErrors);
  }, [dataBlockRuns]);
  const blockRuns = useMemo(() => dataBlockRuns?.block_runs || [], [dataBlockRuns]);

  let pipelineRunsRequestQuery = {
    ...runsRequestQuery,
    disable_retries_grouping: true,
  };
  if (q?.status) {
    pipelineRunsRequestQuery.status = q.status;
  }
  if (!isPipelineRunsTab) {
    pipelineRunsRequestQuery = ignoreKeys(pipelineRunsRequestQuery, [MetaQueryEnum.OFFSET]);
  }
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.list(
    pipelineRunsRequestQuery,
    {
      refreshInterval: 5000,
    },
    {
      pauseFetch: !pipelineUUID,
    },
  );
  const pipelineRuns: PipelineRunType[] = useMemo(() => {
    let pipelineRunsFiltered: PipelineRunType[] = dataPipelineRuns?.pipeline_runs || [];
    if (variableSearchText) {
      const lowercaseSearchText = variableSearchText.toLowerCase();
      pipelineRunsFiltered = pipelineRunsFiltered.filter(({
        event_variables: eventVars,
        variables,
      }) =>
        JSON.stringify(variables || {}).toLowerCase().includes(lowercaseSearchText)
        || JSON.stringify(eventVars || {}).toLowerCase().includes(lowercaseSearchText),
      );
    }

    return pipelineRunsFiltered;
  },[dataPipelineRuns?.pipeline_runs, variableSearchText]);
  const totalRuns: number = useMemo(() => isPipelineRunsTab
    ? dataPipelineRuns?.metadata?.count || []
    : dataBlockRuns?.metadata?.count || [],
    [
      dataBlockRuns?.metadata?.count,
      dataPipelineRuns?.metadata?.count,
      isPipelineRunsTab,
    ],
  );
  const hasRunningPipeline = useMemo(() => pipelineRuns.some(({ status }) => (
    status === RunStatusEnum.INITIAL || status === RunStatusEnum.RUNNING
  )), [pipelineRuns]);
  const hasFailedPipelineRun = useMemo(() => pipelineRuns.some(({ status }) => (
    status === RunStatusEnum.FAILED
  )), [pipelineRuns]);
  const selectedRunsArr = useMemo(() => (
    Object.values(selectedRuns || {})
      .filter((val) => val !== null)
  ), [selectedRuns]);
  const selectedRunsCount = selectedRunsArr.length;
  const selectedRunningRunsArr = useMemo(() => (
    Object.values(selectedRuns || {})
      .filter((run) => run !== null && RUNNING_STATUSES.includes(run?.status))
  ), [selectedRuns]);
  const selectedRunningRunsCount = selectedRunningRunsArr.length;

  const [updatePipeline]: any = useMutation(
    api.pipelines.useUpdate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setSelectedRuns({});
            fetchPipelineRuns();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [deletePipelineRun] = useMutation(
    (id: number) => api.pipeline_runs.useDelete(id)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline_run: {
              pipeline_uuid: pipelineUUID,
            },
          }) => {
            // refetch to update table
            fetchPipelineRuns?.();
            // keep the current filters query from url
            const nextQuery = q || {};
            if (pipelineUUID) {
              router.replace(
                '/pipelines/[pipeline]/runs',
                `/pipelines/${pipelineUUID}/runs?${queryString(nextQuery)}`,
                { shallow: true },
              );
            }
            setSelectedRun(null);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const selectedTabPrev = usePrevious(selectedTab);
  useEffect(() => {
    const uuid = q[TAB_URL_PARAM];
    if (uuid) {
      setSelectedTab(TABS.find(({ uuid: tabUUID }) => tabUUID === uuid));
    }
  }, [
    q,
    selectedTab,
    selectedTabPrev,
  ]);

  const pipelineRunActionItems: FlyoutMenuItemType[] = useMemo(() => ([
    {
      isGroupingTitle: true,
      label: () => `${selectedRunsCount} selected`,
      uuid: 'runs_selected_count',
    },
    {
      beforeIcon: <Refresh muted={selectedRunsCount === 0} />,
      disabled: selectedRunsCount === 0,
      label: () => `Retry selected (${selectedRunsCount})`,
      onClick: () => updatePipeline({
        pipeline: {
          pipeline_runs: selectedRunsArr,
          status: PipelineStatusEnum.RETRY,
        },
      }),
      uuid: 'retry_selected',
    },
    {
      beforeIcon: (
        <Refresh
          muted={!hasFailedPipelineRun || hasRunningPipeline}
        />
      ),
      disabled: !hasFailedPipelineRun || hasRunningPipeline,
      label: () => 'Retry all incomplete block runs',
      onClick: () => updatePipeline({
        pipeline: {
          status: PipelineStatusEnum.RETRY_INCOMPLETE_BLOCK_RUNS,
        },
      }),
      openConfirmationDialogue: true,
      uuid: PipelineStatusEnum.RETRY_INCOMPLETE_BLOCK_RUNS,
    },
    {
      beforeIcon: <AlertTriangle muted={selectedRunningRunsCount === 0} />,
      disabled: selectedRunningRunsCount === 0,
      label: () => `Cancel selected running (${selectedRunningRunsCount})`,
      onClick: () => updatePipeline({
        pipeline: {
          pipeline_runs: selectedRunningRunsArr,
          status: RunStatusEnum.CANCELLED,
        },
      }),
      uuid: 'cancel_selected_running',
    },
    {
      beforeIcon: <AlertTriangle muted={!(hasRunningPipeline && isPipelineRunsTab)} />,
      disabled: !(hasRunningPipeline && isPipelineRunsTab),
      label: () => 'Cancel all running',
      onClick: () => updatePipeline({
        pipeline: {
          status: RunStatusEnum.CANCELLED,
        },
      }),
      openConfirmationDialogue: true,
      uuid: CANCEL_ALL_RUNNING_PIPELINE_RUNS_UUID,
    },
  ]), [
    hasFailedPipelineRun,
    hasRunningPipeline,
    isPipelineRunsTab,
    selectedRunningRunsArr,
    selectedRunningRunsCount,
    selectedRunsArr,
    selectedRunsCount,
    updatePipeline,
  ]);

  const paginationEl = useMemo(() => (
    <Spacing p={2}>
      <Paginate
        maxPages={MAX_PAGES}
        onUpdate={(p) => {
          const newPage = Number(p);
          const updatedQuery = {
            ...q,
            page: newPage >= 0 ? newPage : 0,
          };
          setSelectedRun(null);
          router.push(
            '/pipelines/[pipeline]/runs',
            `/pipelines/${pipelineUUID}/runs?${queryString(updatedQuery)}`,
          );
        }}
        page={Number(page)}
        totalPages={Math.ceil(totalRuns / ROW_LIMIT)}
      />
    </Spacing>
  ), [
    page,
    pipelineUUID,
    q,
    router,
    totalRuns,
  ]);

  const tablePipelineRuns = useMemo(() => (
    <>
      <PipelineRunsTable
        allowBulkSelect={pipeline?.type !== PipelineTypeEnum.STREAMING}
        allowDelete
        deletePipelineRun={deletePipelineRun}
        disableKeyboardNav={showActionsMenu}
        emptyMessage={variableSearchText
          ? 'No runs on this page match your search.'
          : undefined
        }
        fetchPipelineRuns={fetchPipelineRuns}
        onClickRow={(rowIndex: number) => setSelectedRun((prev) => {
          const run = pipelineRuns[rowIndex];

          return prev?.id !== run.id ? run : null;
        })}
        pipelineRuns={pipelineRuns}
        selectedRun={selectedRun}
        selectedRuns={selectedRuns}
        setErrors={setErrors}
        setSelectedRun={setSelectedRun}
        setSelectedRuns={setSelectedRuns}
      />
      {paginationEl}
    </>
  ), [
    deletePipelineRun,
    fetchPipelineRuns,
    paginationEl,
    pipeline?.type,
    pipelineRuns,
    selectedRun,
    selectedRuns,
    showActionsMenu,
    variableSearchText,
  ]);

  const tableBlockRuns = useMemo(() => (
    <>
      <BlockRunsTable
        blockRuns={blockRuns}
        pipeline={pipeline}
        sortableColumnIndexes={DEFAULT_SORTABLE_BR_COL_INDEXES}
      />
      {paginationEl}
    </>
  ), [
    blockRuns,
    paginationEl,
    pipeline,
  ]);

  return (
    <PipelineDetailPage
      afterHidden={isPipelineRunsTab && !selectedRun}
      breadcrumbs={[
        {
          label: () => 'Runs',
        },
      ]}
      buildSidekick={isPipelineRunsTab
        ? props => buildTableSidekick({
          ...props,
          selectedRun,
          selectedTab: selectedTabSidekick,
          setSelectedTab: setSelectedTabSidekick,
        })
        : props => buildTableSidekick(props)
      }
      errors={errors || blockRunErrors}
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      setErrors={setErrors}
      title={({ name }) => `${name} runs`}
      uuid={`${PageNameEnum.RUNS}_${pipelineUUID}`}
    >
      <PageSectionHeader>
        <Spacing pr={1} py={1}>
          <FlexContainer alignItems="center">
            <ButtonTabs
              onClickTab={({ uuid }) => {
                if (uuid !== selectedTab?.uuid) {
                  setQuery(null);
                  goToWithQuery({ tab: uuid }, { replaceParams: true });
                }
              }}
              selectedTabUUID={selectedTab?.uuid}
              tabs={TABS}
            />

            {isPipelineRunsTab &&
              <>
                <VerticalDividerStyle right={1} />

                <Spacing px={2}>
                  <FlyoutMenuWrapper
                    items={pipelineRunActionItems}
                    multipleConfirmDialogues
                    onClickCallback={() => setShowActionsMenu(false)}
                    onClickOutside={() => setShowActionsMenu(false)}
                    open={showActionsMenu}
                    parentRef={refActionsMenu}
                    roundedStyle
                    setConfirmationAction={setConfirmationAction}
                    setConfirmationDialogueOpen={setConfirmationDialogueOpenId}
                    topOffset={4}
                    uuid="PipelineRuns/ActionsMenu"
                  >
                    <Button
                      afterIcon={<ArrowDown />}
                      onClick={(() => setShowActionsMenu(prev => !prev))}
                      outline
                      padding="6px 12px"
                    >
                      Actions
                    </Button>
                  </FlyoutMenuWrapper>

                  <ClickOutside
                    onClickOutside={() => setConfirmationDialogueOpenId(null)}
                    open={!!confirmationDialogueOpenId}
                  >
                    <PopupMenu
                      danger={confirmationDialogueOpenId === CANCEL_ALL_RUNNING_PIPELINE_RUNS_UUID}
                      onCancel={() => setConfirmationDialogueOpenId(null)}
                      onClick={() => {
                        confirmationAction?.();
                        setConfirmationDialogueOpenId(null);
                      }}
                      subtitle={'This includes runs on other pages as well, not just the current page.' +
                        (confirmationDialogueOpenId === PipelineStatusEnum.RETRY_INCOMPLETE_BLOCK_RUNS
                          ? ' Incomplete block runs will be retried for FAILED pipeline runs specifically.'
                          : ''
                        )
                      }
                      title={confirmationDialogueOpenId === CANCEL_ALL_RUNNING_PIPELINE_RUNS_UUID
                        ? 'Are you sure you want to cancel all pipeline runs in progress?'
                        : 'Are you sure you want to retry all incomplete block runs for any failed pipeline runs?'
                      }
                      width={POPUP_MENU_WIDTH}
                    />
                  </ClickOutside>
                </Spacing>

                <Select
                  compact
                  defaultColor
                  greyBorder
                  onChange={e => {
                    e.preventDefault();
                    const updatedStatus = e.target.value;
                    if (updatedStatus === 'all') {
                      setQuery(null);
                      goToWithQuery({ tab: TAB_PIPELINE_RUNS.uuid }, { replaceParams: true });
                    } else {
                      goToWithQuery(
                        {
                          page: 0,
                          status: e.target.value,
                        },
                      );
                    }
                  }}
                  paddingRight={UNIT * 4}
                  placeholder="Select run status"
                  value={query?.status}
                >
                  <option key="all_statuses" value="all">
                    All statuses
                  </option>
                  {PIPELINE_RUN_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {RUN_STATUS_TO_LABEL[status]}
                    </option>
                  ))}
                </Select>

                <Spacing ml={2} />

                <TextInput
                  {...SEARCH_INPUT_PROPS}
                  afterIcon={variableSearchText ? <Close /> : null}
                  afterIconClick={() => {
                    setVariableSearchText('');
                    variableSearchInputRef?.current?.focus();
                  }}
                  onChange={e => setVariableSearchText(e.target.value)}
                  paddingVertical={6}
                  placeholder="Search pipeline run variables"
                  ref={variableSearchInputRef}
                  value={variableSearchText}
                />
              </>
            }
          </FlexContainer>
        </Spacing>
      </PageSectionHeader>

      {(!dataPipelineRuns && !dataBlockRuns)
        ?
          <Spacing m={3}>
            <Spinner inverted />
          </Spacing>
        :
          <>
            {isPipelineRunsTab && tablePipelineRuns}
            {TAB_BLOCK_RUNS.uuid === selectedTab?.uuid && tableBlockRuns}
          </>
      }
    </PipelineDetailPage>
  );
}

PipelineRuns.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PrivateRoute(PipelineRuns);
