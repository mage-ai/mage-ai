import moment from 'moment';
import BlockRunType from '@interfaces/BlockRunType';

export function createBlockStatus(blockRuns: BlockRunType[]) {
  return blockRuns?.reduce(
    (prev, blockRun) => {
      const {
        block_uuid: blockUuid,
        completed_at: completedAt,
        started_at: startedAt,
        status,
      } = blockRun;

      let runtime = null;

      if (startedAt && completedAt) {
        const completedAtTs = moment(completedAt).valueOf();
        const startedAtTs = moment(startedAt).valueOf();
        
        runtime = completedAtTs - startedAtTs;
      }

      return {
        ...prev,
        [blockUuid]: {
          runtime,
          status: status,
        }
      }
    },
    {},
  );
}

export function getTimeInUTC(dateTime: string) {
  if (!dateTime) {
    return null;
  }
  const date = new Date(moment(dateTime).valueOf());

  const utcTs = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
  return new Date(utcTs);
}
