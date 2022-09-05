import NextLink from 'next/link';
import Router from 'next/router';
import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useState } from 'react';

import BlocksSeparatedGradient from '@oracle/icons/custom/BlocksSeparatedGradient';
import BlockRunType from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Circle from '@oracle/elements/Circle';
import DependencyGraph from '@components/DependencyGraph';
import Flex from '@oracle/components/Flex';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PageSectionHeader from '@components/shared/Sticky/PageSectionHeader';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunGradient from '@oracle/icons/custom/PipelineRunGradient';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  BlocksSeparated,
  ChevronRight,
  PipelineRun,
  TodoList,
} from '@oracle/icons';
import usePrevious from '@utils/usePrevious';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEqual } from '@utils/hash';
import { indexBy } from '@utils/array';
import { queryFromUrl } from '@utils/url';

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

type PipelineRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineRuns({
  pipeline: pipelineProp,
}: PipelineRunsProp) {
  const themeContext = useContext(ThemeContext);
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_PIPELINE_RUNS);
  const [query, setQuery] = useState<{
    pipeline_run_id?: number;
    pipeline_uuid?: string;
  }>(null);

  const pipelineUUID = pipelineProp.uuid;
  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID);
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);
  const blocks = useMemo(() => pipeline.blocks || [], [pipeline]);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  const { data: dataPipelineRuns } = api.pipeline_runs.list({
    pipeline_uuid: pipelineUUID,
  });
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  const { data: dataBlockRuns } = api.block_runs.list(ignoreKeys(query, [TAB_URL_PARAM]), {}, {
    pauseFetch: !query,
  });
  const blockRuns = useMemo(() => dataBlockRuns?.block_runs || [], [dataBlockRuns]);

  const [selectedRun, setSelectedRun] = useState<PipelineRunType>();
  const buildSidekick = useMemo(() => {
    return props => {
      const updatedProps = { ...props };
      if (selectedRun) {
        updatedProps['blockStatus'] = selectedRun.block_runs?.reduce(
          (prev, { block_uuid, status }) => ({ ...prev, [block_uuid]: status }),
          {},
        );
      } else {
        updatedProps['noStatus'] = true;
      }

      return (
        <DependencyGraph
          {...updatedProps}
        />
      );
    };
  }, [selectedRun]);

  const q = queryFromUrl();
  const qPrev = usePrevious(q);
  useEffect(() => {
    const { pipeline_run_id: pipelineRunId } = q;

    if (!isEqual(q, qPrev)) {
      let newQuery = { ...q };

      if (pipelineRunId) {
        newQuery.pipeline_run_id = pipelineRunId;
      } else {
        newQuery.pipeline_uuid = pipelineUUID;
      }

      setQuery(newQuery);
    }
  }, [
    pipelineUUID,
    q,
    qPrev,
  ]);

  const selectedTabPrev = usePrevious(selectedTab);
  useEffect(() => {
    const uuid = q[TAB_URL_PARAM];
    if (uuid) {
      setSelectedTab(TABS.find(({ uuid: tabUUID }) => tabUUID === uuid))
    }
  }, [
    q,
    selectedTab,
    selectedTabPrev,
  ]);

  const tablePipelineRuns = useMemo(() => {
    const tableProps = {
      columnFlex: [null, 1, 2, 1, 2, null, null],
      columns: [
        {
          uuid: 'Date',
        },
        {
          uuid: 'Status',
        },
        {
          uuid: 'Trigger',
        },
        {
          uuid: 'Block runs',
        },
        {
          uuid: 'Completed',
        },
        {
          uuid: 'Logs',
        },
        {
          label: () => '',
          uuid: 'action',
        },
      ],
      onClickRow: (rowIndex: number) => setSelectedRun(pipelineRuns[rowIndex]),
      rows: pipelineRuns.map(({
        block_runs_count: blockRunsCount,
        completed_at: completedAt,
        created_at: createdAt,
        id,
        pipeline_schedule_id: pipelineScheduleId,
        pipeline_schedule_name: pipelineScheduleName,
        pipeline_uuid: pipelineUUID,
        status,
      }: PipelineRunType) => [
        <Text monospace default>
          {createdAt}
        </Text>,
        <Text
          danger={RunStatus.FAILED === status}
          info={RunStatus.INITIAL === status}
          default={RunStatus.CANCELLED === status}
          success={RunStatus.COMPLETED === status}
          warning={RunStatus.RUNNING === status}
        >
          {status}
        </Text>,
        <NextLink
          as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
          href={'/pipelines/[pipeline]/triggers/[...slug]'}
          passHref
        >
          <Link bold sameColorAsText>
            {pipelineScheduleName}
          </Link>
        </NextLink>,
        <Text default monospace>
          {blockRunsCount}
        </Text>,
        <Text default monospace>
          {completedAt || '-'}
        </Text>,
        <Button
          default
          iconOnly
          noBackground
          onClick={() => Router.push(
            `/pipelines/${pipelineUUID}/logs?pipeline_run_id[]=${id}`,
          )}
        >
          <TodoList default size={2 * UNIT} />
        </Button>,
        <Flex flex={1} justifyContent="flex-end">
          <ChevronRight default size={2 * UNIT} />
        </Flex>,
      ]),
    };

    return (
      <Table
        {...tableProps}
        uuid="pipeline-runs"
      />
    );
  }, [
    pipelineRuns,
    pipelineUUID,
  ]);

  const tableBlockRuns = useMemo(() => {
    const tableProps = {
      columnFlex: [null, 1, 2, 4, null, null],
      columns: [
        {
          uuid: 'Date',
        },
        {
          uuid: 'Status',
        },
        {
          uuid: 'Block',
        },
        {
          uuid: 'Trigger',
        },
        {
          uuid: 'Completed',
        },
        {
          uuid: 'Logs',
        },
      ],
      rows: blockRuns.map(({
        block_uuid: blockUUID,
        completed_at: completedAt,
        created_at: createdAt,
        id,
        pipeline_schedule_id: pipelineScheduleId,
        pipeline_schedule_name: pipelineScheduleName,
        status,
      }: BlockRunType) => [
        <Text monospace default>
          {createdAt}
        </Text>,
        <Text
          danger={RunStatus.FAILED === status}
          info={RunStatus.INITIAL === status}
          default={RunStatus.CANCELLED === status}
          success={RunStatus.COMPLETED === status}
          warning={RunStatus.RUNNING === status}
        >
          {status}
        </Text>,
        <NextLink
          as={`/pipelines/${pipelineUUID}/edit?block_uuid=${blockUUID}`}
          href={'/pipelines/[pipeline]/edit'}
          passHref
        >
          <Link
            bold
            sameColorAsText
            verticalAlignContent
          >
            <Circle
              color={getColorsForBlockType(blocksByUUID[blockUUID]?.type, {
                theme: themeContext,
              }).accent}
              size={UNIT * 1.5}
              square
            />
            <Spacing mr={1} />
            <Text monospace>
              {blockUUID}
            </Text>
          </Link>
        </NextLink>,
        <NextLink
          as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
          href={'/pipelines/[pipeline]/triggers/[...slug]'}
          passHref
        >
          <Link bold sameColorAsText>
            {pipelineScheduleName}
          </Link>
        </NextLink>,
        <Text monospace default>
          {completedAt || '-'}
        </Text>,
        <Button
          default
          iconOnly
          noBackground
          onClick={() => Router.push(
            `/pipelines/${pipelineUUID}/logs?block_run_id[]=${id}`,
          )}
        >
          <TodoList default size={2 * UNIT} />
        </Button>,
      ]),
    };

    return (
      <Table
        {...tableProps}
        uuid="block-runs"
      />
    );
  }, [
    blockRuns,
    blocksByUUID,
    pipelineUUID,
    themeContext,
  ]);

  return (
    <PipelineDetailPage
      buildSidekick={buildSidekick}
      breadcrumbs={[
        {
          label: () => 'Runs',
        },
      ]}
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      title={({ name }) => `${name} runs`}
      uuid={`${PageNameEnum.RUNS}_${pipelineUUID}`}
    >
      <PageSectionHeader>
        <Spacing py={1}>
          <ButtonTabs
            onClickTab={({ uuid }) => goToWithQuery({ tab: uuid })}
            selectedTabUUID={selectedTab?.uuid}
            tabs={TABS}
          />
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

export default PipelineRuns;
