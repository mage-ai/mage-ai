import moment from 'moment';

import BlockRunType, { RunStatus as RunStatusBlockRun } from '@interfaces/BlockRunType';
import PipelineRunType from '@interfaces/PipelineRunType';
import { sortByKey, sum } from '@utils/array';

function completedBlockRuns(pipelineRun: PipelineRunType): BlockRunType[] {
  const blockRuns = pipelineRun?.block_runs || [];

  return blockRuns?.filter(({ status }) => RunStatusBlockRun.COMPLETED === status);
}

export function pipelineRunEstimatedTimeRemaining(pipelineRun: PipelineRunType): {
  [stream: string]: number;
} {
  const {
    block_runs: blockRuns,
  } = pipelineRun;

  const blockRunsByStream = {};
  blockRuns?.forEach((br: BlockRunType) => {
    const {
      block_uuid: uuid,
    } = br;
    const [uuidOriginal, stream, index] = uuid.split(':');

    if (!blockRunsByStream[stream]) {
      blockRunsByStream[stream] = [];
    }

    blockRunsByStream[stream].push(br);
  });

  const etaByStream = {};
  Object.entries(blockRunsByStream).forEach(([stream, blockRunsForStream]) => {
    const blocksCompleted =
      blockRunsForStream.filter(({ status }) => RunStatusBlockRun.COMPLETED === status);

    const runtimes = blocksCompleted.map(({
      completed_at: ca,
      started_at: sa,
    }) => {
        const a = moment(ca);
        const b = moment(sa);

        return a.diff(b, 'second');
    });

    const completed = blocksCompleted.length;
    const total = blockRunsForStream.length;

    etaByStream[stream] = {
      completed,
      runtime: runtimes.length >= 1 ? sum(runtimes) / runtimes.length : null,
      total,
    };
  });

  return etaByStream;
}

export function pipelineRunProgress(pipelineRun: PipelineRunType): number {
  const {
    block_runs: blockRuns,
  } = pipelineRun;

  const total = blockRuns?.length || 1;
  const completed = completedBlockRuns(pipelineRun).length || 0;

  return completed / total;
}
