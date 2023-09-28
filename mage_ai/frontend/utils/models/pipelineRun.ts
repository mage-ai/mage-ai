import moment from 'moment';

import BlockRunType, { RunStatus as RunStatusBlockRun } from '@interfaces/BlockRunType';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import { prettyUnitOfTime } from '@utils/string';
import { sortByKey, sum } from '@utils/array';

function completedBlockRuns(pipelineRun: PipelineRunType): BlockRunType[] {
  const blockRuns = pipelineRun?.block_runs || [];

  return blockRuns?.filter(({ status }) => RunStatusBlockRun.COMPLETED === status);
}

export function getStreams(pipelineRun: PipelineRunType): string[] {
  return Object.keys(pipelineRun?.metrics?.blocks || {}).sort();
}

export function getRecordsData(pipelineRun: PipelineRunType, streamToSelect: string = null): {
  errors: { [key: string]: any };
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

  const blockRuns = pipelineRun?.block_runs || [];
  const metricsBlocks = pipelineRun?.metrics?.blocks || {};
  const metricsPipeline = pipelineRun?.metrics?.pipeline || {};

  const blockRunsByStream = getBlockRunsByStream(pipelineRun);

  Object.entries(metricsBlocks).forEach(([stream, obj]) => {
    if (streamToSelect && streamToSelect !== stream) {
      return;
    }

    const {
      destinations = {
        records_affected: null,
        records_inserted: null,
        records_updated: null,
      },
      sources = {
        records: null,
      },
    } = obj || {};

    const blockRunsForStream = blockRunsByStream[stream] || [];

    if (streamToSelect
      && streamToSelect === stream
      && blockRunsForStream.every(({ status }) => RunStatusBlockRun.COMPLETED === status)
      && records === null
    ) {
      records = 0;
    }

    if (metricsPipeline?.[stream]?.record_counts) {
      if (records === null) {
        records = 0;
      }
      records += Number(metricsPipeline?.[stream]?.record_counts);
    } else if (sources?.records) {
      if (records === null) {
        records = 0;
      }
      records += Number(sources.records);
    }

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
        if (!errors[stream]) {
          errors[stream] = {};
        }

        errors[stream][key] = {
          error: obj2?.error,
          errors: obj2?.errors,
          message: obj2?.message,
        };
      }
    });
  });

  blockRuns?.forEach(({
    block_uuid: blockUUID,
    metrics,
    status,
  }) => {
    if (RunStatusBlockRun.FAILED === status && metrics?.error && blockUUID) {
      const [uuid, stream, index] = blockUUID.split(':');
      if (!errors[stream]) {
        errors[stream] = {};
      }
      // TODO (tommy dang): determine if its an error in a source, transformer, or destination.
      errors[stream][''] = metrics.error;
    }
  });

  return {
    errors,
    records,
    recordsInserted,
    recordsProcessed,
    recordsUpdated,
  };
}

export function getBlockRunsByStream(pipelineRun: PipelineRunType): {
  [stream: string]: BlockRunType[];
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

  return blockRunsByStream;
}

export function pipelineRunEstimatedTimeRemaining(pipelineRun: PipelineRunType): {
  [stream: string]: {
    completed: number;
    runtime: number;
    total: number;
  };
} {
  const blockRunsByStream = getBlockRunsByStream(pipelineRun);

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

export function getTimesFromStream(pipelineRun: PipelineRunType, stream: string): {
  completed: number;
  completedAt: string;
  done: boolean;
  progress: number;
  runtime: number;
  startedAt: string;
  status: RunStatusBlockRun;
  timeText: string;
  total: number;
  updatedAt: string;
} {
  const blockRunsByStream = getBlockRunsByStream(pipelineRun);
  const etaByStream = pipelineRunEstimatedTimeRemaining(pipelineRun);

  const metrics = pipelineRun?.metrics || {
    blocks: null,
    pipeline: null,
  };
  const metricsBlocks = metrics.blocks || {};
  const metricsPipeline = metrics.pipeline || {};

  const metricsBlock1 = metricsBlocks[stream] || {};
  const metricsBlock2 = metricsPipeline[stream] || {};

  const etaForStream = etaByStream[stream] || {
    completed: null,
    total: null,
  };
  const {
    completed,
    total,
  } = etaForStream;
  const progress = completed && total ? completed / total : 0;

  const brs = blockRunsByStream[stream] || [];
  const done = brs.every(({ status }) => RunStatusBlockRun.COMPLETED === status);
  const br = sortByKey(brs, ({ updated_at: ts }) => ts, { ascending: false })[0];
  const startedAt =
    sortByKey(brs, ({ started_at: ts }) => ts, { ascending: true })[0]?.started_at;

  let completedAt;
  let runtime = 0;
  let timeText;
  let updatedAt;

  if (done) {
    completedAt =
      sortByKey(brs, ({ completed_at: ts }) => ts, { ascending: false })[0]?.completed_at;
  } else if (br) {
    updatedAt = br?.updated_at;
  }

  const a = done
    ? moment.utc(completedAt || updatedAt)
    : moment.utc();
  const b = moment.utc(startedAt);

  runtime = a.diff(b, 'second');

  return {
    completed,
    completedAt,
    done,
    progress,
    runtime,
    startedAt,
    status: br?.status,
    timeText: prettyUnitOfTime(runtime),
    total,
    updatedAt,
  };
}
