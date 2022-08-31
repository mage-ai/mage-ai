import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import BlockRunType, { RunStatus } from '@interfaces/BlockRunType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlexTable from '@oracle/components/FlexTable';
import Link from '@oracle/elements/Link';
import PipelineDetailPage from '@components/PipelineDetailPage';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { queryFromUrl } from '@utils/url';

type BlockRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function BlockRuns({
  pipeline,
}: BlockRunsProp) {
  const pipelineUUID = pipeline.uuid;
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
      <FlexTable
        columnHeaders={[
          <Text bold monospace muted>
            Run date
          </Text>,
          <Text bold monospace muted>
            Status
          </Text>,
          <Text bold monospace muted>
            Schedule
          </Text>,
          <Text bold monospace muted>
            Block
          </Text>,
          <Text bold monospace muted>
            Completed at
          </Text>,
        ]}
        columnFlex={[3, 2, 2, 3, 3, 1]}
        rows={blockRuns.map(({
          block_uuid: blockUUID,
          completed_at: completedAt,
          created_at: createdAt,
          pipeline_schedule_id: pipelineScheduleId,
          pipeline_schedule_name: pipelineScheduleName,
          status,
        }: BlockRunType) => [
          <Text monospace>
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
            as={`/pipelines/${pipelineUUID}/schedules/${pipelineScheduleId}`}
            href={'/pipelines/[pipeline]/schedules/[...slug]'}
            passHref
          >
            <Link sameColorAsText underline>
              {pipelineScheduleName}
            </Link>
          </NextLink>,
          <Text>
            {blockUUID}
          </Text>,
          <Text monospace muted={!completedAt}>
            {completedAt || '-'}
          </Text>,
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
