import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BlockRunsTable, {
  COL_IDX_TO_BLOCK_RUN_ATTR_MAPPING,
  DEFAULT_SORTABLE_BR_COL_INDEXES,
} from '@components/PipelineDetail/BlockRuns/Table';
import BlockRunType, { BlockRunReqQueryParamsType } from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Paginate, { MAX_PAGES } from '@components/shared/Paginate';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType, {
  COMPLETED_STATUSES,
  RUNNING_STATUSES,
  RunStatus,
} from '@interfaces/PipelineRunType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import api from '@api';
import buildTableSidekick, {
  TAB_OUTPUT,
  TAB_TREE,
  TABS as TABS_SIDEKICK,
} from '@components/PipelineDetail/BlockRuns/buildTableSidekick';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SortDirectionEnum, SortQueryEnum } from '@components/shared/Table/constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { datetimeInLocalTimezone } from '@utils/date';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { queryFromUrl, queryString } from '@utils/url';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

const ROW_LIMIT = 100;

type PipelineBlockRunsProps = {
  pipeline: PipelineType;
  pipelineRun: PipelineRunType;
};

function PipelineBlockRuns({
  pipeline: pipelineProp,
  pipelineRun: pipelineRunProp,
}: PipelineBlockRunsProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const router = useRouter();
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;

  const [selectedRun, setSelectedRun] = useState<BlockRunType>(null);
  const [selectedTabSidekick, setSelectedTabSidekick] = useState<TabType>(TABS_SIDEKICK[0]);
  const [errors, setErrors] = useState<ErrorsType>(null);
  const [pipelineRunStatus, setPipelineRunStatus] = useState(null);
  const isPipelineRunIdle =
    // @ts-ignore
    useMemo(
      () => !!pipelineRunStatus && pipelineRunStatus !== RunStatus.RUNNING,
      [pipelineRunStatus],
    );

  const pipelineUUID = pipelineProp.uuid;
  const { data: dataPipeline } = api.pipelines.detail(
    pipelineUUID,
    {
      includes_content: false,
      includes_outputs: false,
    },
    {
      revalidateOnFocus: false,
    },
  );
  const pipeline = useMemo(
    () => ({
      ...dataPipeline?.pipeline,
      uuid: pipelineUUID,
    }),
    [dataPipeline, pipelineUUID],
  );

  const { data: dataPipelineRun, mutate: fetchPipelineRun } = api.pipeline_runs.detail(
    pipelineRunProp.id,
    {
      _format: 'with_basic_details',
    },
    {
      refreshInterval: !isPipelineRunIdle ? 3000 : null,
      revalidateOnFocus: true,
    },
  );
  const pipelineRun: PipelineRunType = useMemo(
    () => dataPipelineRun?.pipeline_run || {},
    [dataPipelineRun],
  );
  const {
    execution_date: pipelineRunExecutionDate,
    id: pipelineRunId,
    status: pipelineRunStatusProp,
  } = pipelineRun;

  const blockRunsRequestQuery: BlockRunReqQueryParamsType = {
    _limit: ROW_LIMIT,
    _offset: page * ROW_LIMIT,
    pipeline_run_id: pipelineRunId,
  };
  const sortColumnIndexQuery = q?.[SortQueryEnum.SORT_COL_IDX];
  const sortDirectionQuery = q?.[SortQueryEnum.SORT_DIRECTION];
  if (sortColumnIndexQuery) {
    const blockRunSortColumn = COL_IDX_TO_BLOCK_RUN_ATTR_MAPPING[sortColumnIndexQuery];
    const sortDirection = sortDirectionQuery || SortDirectionEnum.ASC;
    blockRunsRequestQuery.order_by = `${blockRunSortColumn}%20${sortDirection}`;
  }

  useEffect(() => {
    if (pipelineRunStatus !== pipelineRunStatusProp) {
      setPipelineRunStatus(pipelineRunStatusProp);
    }
  }, [pipelineRunStatus, pipelineRunStatusProp]);

  const { data: dataBlockRuns, mutate: fetchBlockRuns } = api.block_runs.list(
    blockRunsRequestQuery,
    {
      refreshInterval: !isPipelineRunIdle ? 5000 : null,
    },
    {
      pauseFetch: typeof pipelineRunId === 'undefined' || pipelineRunId === null,
    },
  );
  const blockRuns = useMemo(() => dataBlockRuns?.block_runs || [], [dataBlockRuns]);

  const blockUuids = blockRuns.map(({ block_uuid }) => block_uuid);
  const blockUuidArg = useMemo(() => blockUuids, [blockUuids]);

  const { data: dataBlocks } = api.blocks.pipeline_runs.list(
    pipelineRunProp?.id,
    {
      _limit: ROW_LIMIT,
      block_uuid: blockUuidArg,
    },
    {
      refreshInterval: !isPipelineRunIdle ? 5000 : null,
    },
  );

  const [updatePipelineRun, { isLoading: isLoadingUpdatePipelineRun }]: any = useMutation(
    api.pipeline_runs.useUpdate(pipelineRunId),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: ({ pipeline_run: pr }) => {
            setSelectedRun(null);
            fetchBlockRuns?.();
            fetchPipelineRun();
          },
          onErrorCallback: (response, errors) =>
            setErrors({
              errors,
              response,
            }),
        }),
    },
  );

  const { data: dataOutput, loading: loadingOutput } = api.outputs.block_runs.list(selectedRun?.id);

  useEffect(() => {
    if (!selectedRun && selectedTabSidekick?.uuid === TAB_OUTPUT.uuid) {
      setSelectedTabSidekick(TAB_TREE);
    }
  }, [selectedRun, selectedTabSidekick?.uuid]);

  const tableBlockRuns = useMemo(
    () => (
      <BlockRunsTable
        blockRuns={blockRuns}
        onClickRow={(rowIndex: number) => {
          setSelectedRun(prev => {
            const run = blockRuns[rowIndex];
            const newRun = prev?.id !== run.id ? run : null;

            if (newRun) {
              setSelectedTabSidekick(prev => {
                if (prev !== TAB_OUTPUT) {
                  return TAB_OUTPUT;
                }

                return prev;
              });
            }

            return newRun;
          });
        }}
        pipeline={pipeline}
        selectedRun={selectedRun}
        setErrors={setErrors}
        sortableColumnIndexes={DEFAULT_SORTABLE_BR_COL_INDEXES}
      />
    ),
    [blockRuns, pipeline, selectedRun],
  );

  const showRetryIncompleteBlocksButton =
    pipeline?.type !== PipelineTypeEnum.STREAMING &&
    pipelineRunStatus &&
    pipelineRunStatus !== RunStatus.COMPLETED;
  const showRetryFromBlockButton =
    (pipeline?.type === PipelineTypeEnum.PYTHON ||
      pipeline?.type === PipelineTypeEnum.INTEGRATION) &&
    selectedRun &&
    COMPLETED_STATUSES.includes(pipelineRunStatus);

  const totalBlockRuns = useMemo(() => dataBlockRuns?.metadata?.count || [], [dataBlockRuns]);
  const paginationEl = useMemo(
    () => (
      <Spacing p={2}>
        <Paginate
          maxPages={MAX_PAGES}
          onUpdate={p => {
            const newPage = Number(p);
            const updatedQuery = {
              ...q,
              page: newPage >= 0 ? newPage : 0,
            };
            setSelectedRun(null);
            router.push(
              '/pipelines/[pipeline]/runs/[run]',
              `/pipelines/${pipelineUUID}/runs/${pipelineRunId}?${queryString(updatedQuery)}`,
            );
          }}
          page={Number(page)}
          totalPages={Math.ceil(totalBlockRuns / ROW_LIMIT)}
        />
      </Spacing>
    ),
    [page, pipelineRunId, pipelineUUID, q, router, totalBlockRuns],
  );

  const buildSidekick = useCallback(
    props =>
      buildTableSidekick({
        ...props,
        blocks: dataBlocks?.blocks,
        blockRuns,
        blocksOverride: totalBlockRuns <= ROW_LIMIT ? dataBlocks?.blocks : null,
        loadingData: loadingOutput,
        outputs: dataOutput?.outputs,
        selectedRun,
        selectedTab: selectedTabSidekick,
        setSelectedTab: setSelectedTabSidekick,
        showDynamicBlocks: true,
      }),
    [
      blockRuns,
      dataBlocks,
      dataOutput,
      loadingOutput,
      selectedRun,
      selectedTabSidekick,
      setSelectedTabSidekick,
      totalBlockRuns,
    ],
  );

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Runs',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/runs`,
            href: '/pipelines/[pipeline]/runs',
          },
        },
        {
          label: () =>
            displayLocalTimezone
              ? datetimeInLocalTimezone(pipelineRunExecutionDate, displayLocalTimezone)
              : pipelineRunExecutionDate,
        },
      ]}
      buildSidekick={buildSidekick}
      errors={errors}
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      setErrors={setErrors}
      subheader={
        (showRetryIncompleteBlocksButton || showRetryFromBlockButton) && (
          <FlexContainer alignItems="center">
            {RUNNING_STATUSES.includes(pipelineRunStatus) && (
              <Flex>
                <Text bold default large>
                  Pipeline is running
                </Text>
                <Spacing mr={1} />
                <Spinner inverted />
                <Spacing mr={2} />
              </Flex>
            )}
            {showRetryIncompleteBlocksButton && (
              <>
                <Button
                  danger
                  loading={isLoadingUpdatePipelineRun}
                  onClick={e => {
                    pauseEvent(e);
                    updatePipelineRun({
                      pipeline_run: {
                        pipeline_run_action: 'retry_blocks',
                      },
                    });
                  }}
                  outline
                >
                  Retry incomplete blocks
                </Button>
                <Spacing mr={2} />
              </>
            )}
            {showRetryFromBlockButton && (
              <Button
                loading={isLoadingUpdatePipelineRun}
                onClick={e => {
                  pauseEvent(e);
                  updatePipelineRun({
                    pipeline_run: {
                      from_block_uuid: selectedRun.block_uuid,
                      pipeline_run_action: 'retry_blocks',
                    },
                  });
                }}
                outline
                primary
              >
                Retry from selected block ({selectedRun.block_uuid})
              </Button>
            )}
          </FlexContainer>
        )
      }
      title={({ name }) => `${name} runs`}
      uuid={`pipelines/detail/${PageNameEnum.RUNS}`}
    >
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>Block runs</Headline>
      </Spacing>

      <Divider light mt={PADDING_UNITS} short />
      {tableBlockRuns}
      {paginationEl}
    </PipelineDetailPage>
  );
}

PipelineBlockRuns.getInitialProps = async (ctx: any) => {
  const {
    pipeline: pipelineUUID,
    run: pipelineRunId,
  }: {
    pipeline: string;
    run: number;
  } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
    pipelineRun: {
      id: pipelineRunId,
    },
  };
};

export default PrivateRoute(PipelineBlockRuns);
