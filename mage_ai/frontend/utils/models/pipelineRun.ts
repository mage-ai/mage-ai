import moment from 'moment';

import BlockRunType, { RunStatus as RunStatusBlockRun } from '@interfaces/BlockRunType';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import { sortByKey, sum } from '@utils/array';

function completedBlockRuns(pipelineRun: PipelineRunType): BlockRunType[] {
  const blockRuns = pipelineRun?.block_runs || [];

  return blockRuns?.filter(({ status }) => RunStatusBlockRun.COMPLETED === status);
}

export function getRecordsData(pipelineRun: PipelineRunType): {
  errors: {
    [key: string]: any;
  };
  records: number;
  recordsInserted: number;
  recordsProcessed: number;
  recordsUpdated: number;
} {
  let records = null;
  let recordsInserted = null;
  let recordsProcessed = null;
  let recordsUpdated = null;
  const errors = {};

  const metricsBlocks = pipelineRun?.metrics?.blocks || {};
  const metricsPipeline = pipelineRun?.metrics?.pipeline || {};

  Object.entries(metricsBlocks).forEach(([stream, obj]) => {
    const {
      destinations = {},
      sources = {},
    } = obj || {};

    records += Number(metricsPipeline?.[stream]?.record_counts || 0);

    if (destinations?.records_updated) {
      if (recordsProcessed === null) {
        recordsProcessed = 0;
      }
      recordsProcessed += Number(destinations.records_updated);

      if (recordsUpdated === null) {
        recordsUpdated = 0;
      }
      recordsUpdated += Number(destinations.records_updated);
    } else if (destinations?.records_inserted) {
      if (recordsProcessed === null) {
        recordsProcessed = 0;
      }
      recordsProcessed += Number(destinations.records_inserted);

      if (recordsInserted === null) {
        recordsInserted = 0;
      }
      recordsInserted += Number(destinations.records_inserted);
    } else if (destinations?.records_affected) {
      if (recordsProcessed === null) {
        recordsProcessed = 0;
      }
      recordsProcessed += Number(destinations.records_affected);
    }

    ['destinations', 'sources'].forEach((key: string) => {
      const obj2 = obj[key] || {};

      if (obj2?.error) {
        if (!errors.stream) {
          errors[stream] = {}
        }

        errors[stream][key] = {
          error: obj2?.error,
          errors: obj2?.errors,
          message: obj2?.message,
        };
      }
    });
  });

  return {
    errors,
    records,
    recordsInserted,
    recordsProcessed,
    recordsUpdated,
  };
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
        const a = moment.utc(ca);
        const b = moment.utc(sa);

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

export function pipelineRunRuntime(pipelineRun: PipelineRunType): number {
  const {
    completed_at: completedAt,
    block_runs: blockRuns = [],
    status,
  } = pipelineRun;

  if (!blockRuns?.length) {
    return 0;
  }

  let a = moment.utc();
  if (completedAt) {
    a = moment.utc(completedAt);
  } else if ([RunStatus.CANCELLED, RunStatus.FAILED].includes(status)) {
    const latestBlockRun =
      sortByKey(blockRuns, ({ started_at: ts }) => ts, { ascending: false })[0];

    a = moment.utc(latestBlockRun.updated_at);
  }
  const b = moment.utc(pipelineRun.created_at);

  return a.diff(b, 'second');
}
