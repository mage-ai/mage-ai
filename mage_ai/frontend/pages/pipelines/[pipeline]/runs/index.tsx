import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BlocksSeparatedGradient from '@oracle/icons/custom/BlocksSeparatedGradient';
import BlockRunsTable from '@components/PipelineDetail/BlockRuns/Table';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import Paginate from '@components/shared/Paginate';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunGradient from '@oracle/icons/custom/PipelineRunGradient';
import PipelineRunType, {
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
} from '@interfaces/PipelineRunType';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PrivateRoute from '@components/shared/PrivateRoute';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import buildTableSidekick, {
  TABS as TABS_SIDEKICK,
} from '@components/PipelineRun/shared/buildTableSidekick';
import usePrevious from '@utils/usePrevious';

import {
  BlocksSeparated,
  PipelineRun,
} from '@oracle/icons';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEqual } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl, queryString } from '@utils/url';

const TAB_URL_PARAM = 'tab';

const TAB_PIPELINE_RUNS = {
  Icon: PipelineRun,
  IconSelected: PipelineRunGradient,
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

const LIMIT = 25;

type PipelineRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineRuns({
  pipeline: pipelineProp,
}: PipelineRunsProp) {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorsType>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_PIPELINE_RUNS);
  const [selectedTabSidekick, setSelectedTabSidekick] = useState<TabType>(TABS_SIDEKICK[0]);
  const [query, setQuery] = useState<{
    offset?: number;
    pipeline_run_id?: number;
    pipeline_uuid?: string;
    status?: RunStatusEnum;
  }>(null);

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

  const { data: dataBlockRuns } = api.block_runs.list(ignoreKeys(query, [TAB_URL_PARAM]), {}, {
    pauseFetch: !query,
  });
  const blockRuns = useMemo(() => dataBlockRuns?.block_runs || [], [dataBlockRuns]);

  const [selectedRun, setSelectedRun] = useState<PipelineRunType>();

  const q = queryFromUrl();
  const qPrev = usePrevious(q);
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
    }
  }, [
    pipelineUUID,
    q,
    qPrev,
  ]);

  const pipelineRunsRequestQuery: PipelineRunReqQueryParamsType = {
    _limit: LIMIT,
    _offset: (q?.page ? q.page : 0) * LIMIT,
    pipeline_uuid: pipelineUUID,
  };
  if (q?.status) {
    pipelineRunsRequestQuery.status = q.status;
  }
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.list(pipelineRunsRequestQuery, { refreshInterval: 5000 });
  const pipelineRuns: PipelineRunType[] = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns: number = useMemo(() => dataPipelineRuns?.metadata?.count || [], [dataPipelineRuns]);
  const hasRunningPipeline = pipelineRuns.some(({ status }) => (
    status === RunStatusEnum.INITIAL || status === RunStatusEnum.RUNNING
  ));

  const [updatePipeline, { isLoading: isLoadingUpdatePipeline }]: any = useMutation(
    api.pipelines.useUpdate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
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

  const tablePipelineRuns = useMemo(() => {
    const page = q?.page ? q.page : 0;

    return (
      <>
        <PipelineRunsTable
          fetchPipelineRuns={fetchPipelineRuns}
          onClickRow={(rowIndex: number) => setSelectedRun((prev) => {
            const run = pipelineRuns[rowIndex];

            return prev?.id !== run.id ? run : null;
          })}
          pipelineRuns={pipelineRuns}
          selectedRun={selectedRun}
          setErrors={setErrors}
        />
        <Spacing p={2}>
          <Paginate
            maxPages={9}
            onUpdate={(p) => {
              const newPage = Number(p);
              const updatedQuery = {
                ...q,
                page: newPage >= 0 ? newPage : 0,
              };
              router.push(
                '/pipelines/[pipeline]/runs',
                `/pipelines/${pipelineUUID}/runs?${queryString(updatedQuery)}`,
              );
            }}
            page={Number(page)}
            totalPages={Math.ceil(totalRuns / LIMIT)}
          />
        </Spacing>
      </>
    );
  }, [
    fetchPipelineRuns,
    pipeline,
    pipelineRuns,
    q,
    selectedRun,
    totalRuns,
  ]);

  const tableBlockRuns = useMemo(() => (
    <BlockRunsTable
      blockRuns={blockRuns}
      pipeline={pipeline}
    />
  ), [
    blockRuns,
    pipeline,
  ]);

  return (
    <PipelineDetailPage
      afterHidden={TAB_PIPELINE_RUNS.uuid === selectedTab?.uuid && !selectedRun}
      breadcrumbs={[
        {
          label: () => 'Runs',
        },
      ]}
      buildSidekick={TAB_PIPELINE_RUNS.uuid === selectedTab?.uuid
        ? props => buildTableSidekick({
          ...props,
          selectedRun,
          selectedTab: selectedTabSidekick,
          setSelectedTab: setSelectedTabSidekick,
        })
        : props => buildTableSidekick(props)
      }
      errors={errors}
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      setErrors={setErrors}
      title={({ name }) => `${name} runs`}
      uuid={`${PageNameEnum.RUNS}_${pipelineUUID}`}
    >
      <PageSectionHeader>
        <Spacing py={1}>
          <FlexContainer alignItems="center">
            {(hasRunningPipeline && TAB_PIPELINE_RUNS.uuid === selectedTab?.uuid) &&
              <Spacing pl={2}>
                <Button
                  danger
                  loading={isLoadingUpdatePipeline}
                  onClick={() => {
                    updatePipeline({
                      pipeline: {
                        status: RunStatusEnum.CANCELLED,
                      },
                    });
                  }}
                  outline
                >
                  Cancel running pipeline runs
                </Button>
              </Spacing>
            }
            <ButtonTabs
              onClickTab={({ uuid }) => {
                setQuery(null);
                goToWithQuery({ tab: uuid }, { replaceParams: true });
              }}
              selectedTabUUID={selectedTab?.uuid}
              tabs={TABS}
            />
            {TAB_PIPELINE_RUNS.uuid === selectedTab?.uuid &&
              <Select
                compact
                defaultColor
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
                {Object.values(RunStatusEnum).map(status => (
                  <option key={status} value={status}>
                    {RUN_STATUS_TO_LABEL[status]}
                  </option>
                ))}
              </Select>
            }
          </FlexContainer>
        </Spacing>
      </PageSectionHeader>

      {TAB_PIPELINE_RUNS.uuid === selectedTab?.uuid && tablePipelineRuns}
      {TAB_BLOCK_RUNS.uuid === selectedTab?.uuid && tableBlockRuns}
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
