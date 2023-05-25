import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import BlockRunsTable from '@components/PipelineDetail/BlockRuns/Table';
import BlockRunType from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
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
import { OutputType } from '@interfaces/BlockType';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

const MAX_COLUMNS = 40;

type PipelineBlockRunsProps = {
  pipeline: PipelineType;
  pipelineRun: PipelineRunType;
};

function PipelineBlockRuns({
  pipeline: pipelineProp,
  pipelineRun: pipelineRunProp,
}: PipelineBlockRunsProps) {
  const [selectedRun, setSelectedRun] = useState<BlockRunType>(null);
  const [selectedTabSidekick, setSelectedTabSidekick] = useState<TabType>(TABS_SIDEKICK[0]);
  const [errors, setErrors] = useState<ErrorsType>(null);

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

  const { data: dataPipelineRun } = api.pipeline_runs.detail(
    pipelineRunProp.id,
    {},
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );
  const pipelineRun: PipelineRunType = useMemo(
    () => dataPipelineRun?.pipeline_run || {},
    [dataPipelineRun],
  );
  const {
    block_runs: pipelineRunBlockRuns,
    execution_date: pipelineRunExecutionDate,
    id: pipelineRunId,
    status: pipelineRunStatus,
  } = pipelineRun;

  const [updatePipelineRun, { isLoading: isLoadingUpdatePipelineRun }]: any = useMutation(
    api.pipeline_runs.useUpdate(pipelineRunId),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
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

  const {
    data: dataOutput,
    loading: loadingOutput,
  } = api.outputs.block_runs.list(selectedRun?.id);

  const {
    sample_data: blockSampleData,
    text_data: textData,
    type: dataType,
  }: OutputType = dataOutput?.outputs?.[0] || {};

  useEffect(() => {
    if (!selectedRun && selectedTabSidekick?.uuid === TAB_OUTPUT.uuid) {
      setSelectedTabSidekick(TAB_TREE);
    }
  }, [selectedRun, selectedTabSidekick?.uuid]);

  const blockRuns = useMemo(() => pipelineRunBlockRuns || [], [pipelineRun]);

  const columns = (blockSampleData?.columns || []).slice(0, MAX_COLUMNS);
  const rows = blockSampleData?.rows || [];

  const tableBlockRuns = useMemo(() => (
    <BlockRunsTable
      blockRuns={blockRuns}
      onClickRow={(rowIndex: number) => {
        setSelectedRun((prev) => {
          const run = blockRuns[rowIndex];
          const newRun = prev?.id !== run.id ? run : null

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
    />
  ), [
    blockRuns,
    pipeline,
    selectedRun,
  ]);

  const showRetryIncompleteBlocksButton = (pipeline?.type !== PipelineTypeEnum.STREAMING
    && pipelineRunStatus
    && pipelineRunStatus !== RunStatus.COMPLETED
  );
  const showRetryFromBlockButton = ((pipeline?.type === PipelineTypeEnum.PYTHON
    || pipeline?.type === PipelineTypeEnum.INTEGRATION
  ) && selectedRun
    && COMPLETED_STATUSES.includes(pipelineRunStatus)
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
          label: () => pipelineRunExecutionDate,
        },
      ]}
      buildSidekick={props => buildTableSidekick({
        ...props,
        blockRuns,
        columns,
        dataType,
        loadingData: loadingOutput,
        rows,
        selectedRun,
        selectedTab: selectedTabSidekick,
        setSelectedTab: setSelectedTabSidekick,
        showDynamicBlocks: true,
        textData,
      })}
      errors={errors}
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      setErrors={setErrors}
      subheader={(showRetryIncompleteBlocksButton || showRetryFromBlockButton) && (
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
                onClick={(e) => {
                  pauseEvent(e);
                  updatePipelineRun({
                    pipeline_run: {
                      'pipeline_run_action': 'retry_blocks',
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
              onClick={(e) => {
                pauseEvent(e);
                updatePipelineRun({
                  pipeline_run: {
                    'from_block_uuid': selectedRun.block_uuid,
                    'pipeline_run_action': 'retry_blocks',
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
      uuid={`${PageNameEnum.RUNS}_${pipelineUUID}_${pipelineRunId}`}
    >
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>
          Block runs
        </Headline>
      </Spacing>

      <Divider light mt={PADDING_UNITS} short />
      {tableBlockRuns}
    </PipelineDetailPage>
  );
}

PipelineBlockRuns.getInitialProps = async (ctx: any) => {
  const {
    pipeline: pipelineUUID,
    run: pipelineRunId,
  }: {
    pipeline: string,
    run: number,
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
