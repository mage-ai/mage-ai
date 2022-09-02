import NextLink from 'next/link';
import Router from 'next/router';
import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import BlockRunType, { RunStatus } from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlexTable from '@oracle/components/FlexTable';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineDetailPage from '@components/PipelineDetailPage';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { TodoList } from '@oracle/icons';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { queryFromUrl } from '@utils/url';

type BlockRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function BlockRuns({
  pipeline: pipelineProp,
}: BlockRunsProp) {
  const themeContext = useContext(ThemeContext);
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

  const [query, setQuery] = useState<{
    pipeline_run_id?: number;
    pipeline_uuid?: string;
  }>(null);

  const { data: dataBlockRuns } = api.block_runs.list(query, {}, {
    pauseFetch: !query,
  });
  const blockRuns = useMemo(() => dataBlockRuns?.block_runs || [], [dataBlockRuns]);

  useEffect(() => {
    const { pipeline_run_id: pipelineRunId } = queryFromUrl();
    if (pipelineRunId) {
      setQuery({ pipeline_run_id: pipelineRunId });
    } else {
      setQuery({ pipeline_uuid: pipelineUUID });
    }
  }, [pipelineUUID]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Block runs',
        },
      ]}
      pageName={PageNameEnum.BLOCK_RUNS}
      pipeline={pipeline}
      title={({ name }) => `${name} block runs`}
    >
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>
          Block runs
        </Headline>
        <Divider light mt={PADDING_UNITS} short />
      </Spacing>

      <Table
        columnFlex={[null, 1, 2, 4, null, null]}
        columns={[
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
            uuid: 'Schedule',
          },
          {
            uuid: 'Completed',
          },
          {
            uuid: 'Logs',
          },
        ]}
        rows={blockRuns.map(({
          block_uuid: blockUUID,
          completed_at: completedAt,
          created_at: createdAt,
          id,
          pipeline_schedule_id: pipelineScheduleId,
          pipeline_schedule_name: pipelineScheduleName,
          status,
        }: BlockRunType) => [
          <Text monospace muted>
            {createdAt}
          </Text>,
          <Text
            danger={RunStatus.FAILED === status}
            info={RunStatus.INITIAL === status}
            muted={RunStatus.CANCELLED === status}
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
            as={`/pipelines/${pipelineUUID}/schedules/${pipelineScheduleId}`}
            href={'/pipelines/[pipeline]/schedules/[...slug]'}
            passHref
          >
            <Link bold sameColorAsText>
              {pipelineScheduleName}
            </Link>
          </NextLink>,
          <Text monospace muted>
            {completedAt || '-'}
          </Text>,
          <Button
            iconOnly
            noBackground
            onClick={() => Router.push(
              `/pipelines/${pipelineUUID}/logs?block_run_id[]=${id}`,
            )}
          >
            <TodoList size={2 * UNIT} />
          </Button>,
        ])}
      />
    </PipelineDetailPage>
  );
}

BlockRuns.getInitialProps = async (ctx: any) => {
  const {
    pipeline: pipelineUUID,
  }: {
    pipeline: string;
  } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default BlockRuns;
