import {
  GroupedPipelineRunCountType,
  RunCountStatsType,
  RunStatusCountType,
  RUN_STATUSES_TO_DISPLAY,
} from '@interfaces/MonitorStatsType';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { RunStatus } from '@interfaces/BlockRunType';

export type PipelineRunDataType = {
  date: string;
} & RunStatusCountType & GroupedPipelineRunCountType;

export type GroupedPipelineRunDataType = {
  date: string;
} & GroupedPipelineRunCountType;

export const getAllPipelineRunData = (
  monitorStats: RunCountStatsType,
  dateRange: string[],
): PipelineRunDataType[] => {
  if (!monitorStats) {
    return [];
  }

  const allPipelineRunData = Object.entries(monitorStats).reduce(
    (obj, [id, { data: scheduleStats }]) => {
      const updated = {};

      Object.entries(scheduleStats).forEach(([date, dateStats]) => {
        let currentStats = {};
        if (date in obj) {
          currentStats = obj[date];
        }
        const updatedStats = {};

        Object.entries(dateStats).forEach(([status, num]) => {
          const currentNum = currentStats?.[status] ? currentStats[status] : 0;
          updatedStats[status] = currentNum + num;
        });
        updated[date] = {
          ...currentStats,
          ...updatedStats,
        };
      });

      return {
        ...obj,
        ...updated,
      };
    },
    {},
  );

  return dateRange.map(date => ({
    date,
    ...(allPipelineRunData[date] || {}),
  }));
};

const INITIAL_RUN_COUNT_STATS = RUN_STATUSES_TO_DISPLAY.reduce(
  (acc, key) => ({
    ...acc,
    [key]: 0,
  }), {},
);
const runStatusesToDisplaySet = new Set(RUN_STATUSES_TO_DISPLAY);

export const getAllPipelineRunDataGrouped = (
  monitorStats: RunCountStatsType,
  dateRange: string[],
): {
  groupedPipelineRunData: GroupedPipelineRunDataType[];
  pipelineRunCountByPipelineType: GroupedPipelineRunCountType;
} => {
  if (!monitorStats) {
    return {
      groupedPipelineRunData: [],
      pipelineRunCountByPipelineType: {},
    };
  }

  const totalPipelineRunCountByPipelineType: GroupedPipelineRunCountType = {
    [PipelineTypeEnum.INTEGRATION]: { ...INITIAL_RUN_COUNT_STATS },
    [PipelineTypeEnum.PYSPARK]: {},
    [PipelineTypeEnum.PYTHON]: { ...INITIAL_RUN_COUNT_STATS },
    [PipelineTypeEnum.STREAMING]: { ...INITIAL_RUN_COUNT_STATS },
  };

  const allPipelineRunData = Object.entries(monitorStats).reduce(
    (obj, [id, { data: scheduleStats }]) => {
      const updated = {};

      Object.entries(scheduleStats).forEach(([date, dateStats]) => {
        let currentStats = {};
        if (date in obj) {
          currentStats = { ...obj[date] };
          updated[date] = { ...currentStats };
        } else {
          updated[date] = {};
        }
        const updatedStats = {};

        Object.entries(dateStats).forEach(([pipelineType, pipelineTypeStats]) => {
          if (date in obj && pipelineType in obj[date]) {
            currentStats[pipelineType] = { ...obj[date][pipelineType] };
          }
          updatedStats[pipelineType] = {};
          Object.entries(pipelineTypeStats).forEach(([status, num]: [RunStatus, number]) => {
            const currentNum = currentStats?.[pipelineType]?.[status]
              ? currentStats[pipelineType][status]
              : 0;
            updatedStats[pipelineType][status] = currentNum + num;
            if (runStatusesToDisplaySet.has(status)) {
              totalPipelineRunCountByPipelineType[pipelineType][status] =
                (totalPipelineRunCountByPipelineType[pipelineType][status] || 0) + num;
            }
          });
          updated[date][pipelineType] = {
            ...currentStats[pipelineType],
            ...updatedStats[pipelineType],
          };
        });
      });

      return {
        ...obj,
        ...updated,
      };
    },
    {},
  );

  const pipelineRunCountsByDate = dateRange.map(date => ({
    date,
    ...(allPipelineRunData[date] || {}),
  }));

  return {
    groupedPipelineRunData: pipelineRunCountsByDate,
    pipelineRunCountByPipelineType: totalPipelineRunCountByPipelineType,
  };
};
