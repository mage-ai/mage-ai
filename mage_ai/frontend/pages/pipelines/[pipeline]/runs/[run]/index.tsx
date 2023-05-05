import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import BlockRunsTable from '@components/PipelineDetail/BlockRuns/Table';
import BlockRunType from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType, { COMPLETED_STATUSES, RunStatus } from '@interfaces/PipelineRunType';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
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
  const pipelineRun = useMemo(
    () => dataPipelineRun?.pipeline_run,
    [dataPipelineRun],
  );

  const [updatePipelineRun, { isLoading: isLoadingUpdatePipelineRun }]: any = useMutation(
    api.pipeline_runs.useUpdate(pipelineRun?.id),
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

  const blockRuns = useMemo(() => pipelineRun?.block_runs, [pipelineRun]);

  const columns = (blockSampleData?.columns || []).slice(0, MAX_COLUMNS);
  const rows = blockSampleData?.rows || [];

  const tableBlockRuns = useMemo(() => (
    <BlockRunsTable
      blockRuns={blockRuns}
      onClickRow={(rowIndex: number) => setSelectedRun((prev) => {
        const run = blockRuns[rowIndex];

        return prev?.id !== run.id ? run : null;
      })}
      pipeline={pipeline}
      selectedRun={selectedRun}
    />
  ), [
    blockRuns,
    pipeline,
    selectedRun,
  ]);

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
          label: () => pipelineRun?.execution_date,
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
      subheader={((pipelineRun?.status && pipelineRun.status !== RunStatus.COMPLETED)
        || (selectedRun && COMPLETED_STATUSES.includes(pipelineRun?.status))) && (
          <FlexContainer alignItems="center">
            {(pipelineRun?.status && pipelineRun.status !== RunStatus.COMPLETED) && (
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
            {(selectedRun && COMPLETED_STATUSES.includes(pipelineRun?.status)) && (
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
      uuid={`${PageNameEnum.RUNS}_${pipelineUUID}_${pipelineRun?.id}`}
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
