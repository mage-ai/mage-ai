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
} & RunStatusCountType;

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
  noPipelineType: boolean = false,
): {
  groupedPipelineRunData: GroupedPipelineRunDataType[];
  pipelineRunCountByPipelineType: GroupedPipelineRunCountType;
  totalPipelineRunCount: number;
  ungroupedPipelineRunData: PipelineRunDataType[];
} => {
  if (!monitorStats) {
    return {
      groupedPipelineRunData: [],
      pipelineRunCountByPipelineType: {},
      totalPipelineRunCount: 0,
      ungroupedPipelineRunData: [],
    };
  }

  const totalPipelineRunCountByPipelineType: GroupedPipelineRunCountType = {
    [PipelineTypeEnum.INTEGRATION]: { ...INITIAL_RUN_COUNT_STATS },
    [PipelineTypeEnum.PYSPARK]: {},
    [PipelineTypeEnum.PYTHON]: { ...INITIAL_RUN_COUNT_STATS },
    [PipelineTypeEnum.STREAMING]: { ...INITIAL_RUN_COUNT_STATS },
  };
  let totalPipelineRunCount = 0;

  const allPipelineRunData = Object.entries(monitorStats).reduce(
    (obj, [id, { data: scheduleStats }]) => {
      const updatedGrouped = {};
      const updatedUngrouped = {};

      Object.entries(scheduleStats).forEach(([date, dateStats]) => {
        let currentStatsGrouped = {};
        let currentStatsUngrouped = {};
        if (date in obj.grouped) {
          currentStatsGrouped = { ...obj.grouped[date] };
          updatedGrouped[date] = { ...currentStatsGrouped };
        } else {
          updatedGrouped[date] = {};
        }
        if (date in obj.ungrouped) {
          currentStatsUngrouped = { ...obj.ungrouped[date] };
        }
        const updatedStatsGrouped = {};
        const updatedStatsUngrouped = {};

        if (noPipelineType) {
          Object.entries(dateStats).forEach(([status, num]: [RunStatus, number]) => {
            const currentNumUngrouped = currentStatsUngrouped?.[status]
              ? currentStatsUngrouped[status]
              : 0;
            updatedStatsUngrouped[status] = updatedStatsUngrouped?.[status]
              ? updatedStatsUngrouped[status] + num
              : currentNumUngrouped + num;

            totalPipelineRunCount += num;
          });
          updatedUngrouped[date] = {
            ...currentStatsUngrouped,
            ...updatedStatsUngrouped,
          };
        } else {
          Object.entries(dateStats).forEach(([pipelineType, pipelineTypeStats]) => {
            const pipelineDoesNotExist = pipelineType === 'null' || pipelineType === null;
            if (pipelineDoesNotExist) {
              return;
            }
            if (date in obj.grouped && pipelineType in obj.grouped[date]) {
              currentStatsGrouped[pipelineType] = { ...obj.grouped[date][pipelineType] };
            }
            updatedStatsGrouped[pipelineType] = {};
            Object.entries(pipelineTypeStats).forEach(([status, num]: [RunStatus, number]) => {
              const currentNumGrouped = currentStatsGrouped?.[pipelineType]?.[status]
                ? currentStatsGrouped[pipelineType][status]
                : 0;
              updatedStatsGrouped[pipelineType][status] = currentNumGrouped + num;

              const currentNumUngrouped = currentStatsUngrouped?.[status]
                ? currentStatsUngrouped[status]
                : 0;
              updatedStatsUngrouped[status] = updatedStatsUngrouped?.[status]
                ? updatedStatsUngrouped[status] + num
                : currentNumUngrouped + num;

              if (runStatusesToDisplaySet.has(status)) {
                totalPipelineRunCountByPipelineType[pipelineType][status] =
                  (totalPipelineRunCountByPipelineType[pipelineType][status] || 0) + num;
              }
              totalPipelineRunCount += num;
            });
            updatedGrouped[date][pipelineType] = {
              ...currentStatsGrouped[pipelineType],
              ...updatedStatsGrouped[pipelineType],
            };
            updatedUngrouped[date] = {
              ...currentStatsUngrouped,
              ...updatedStatsUngrouped,
            };
          });
        }
      });

      return {
        grouped: {
          ...obj.grouped,
          ...updatedGrouped,
        },
        ungrouped: {
          ...obj.ungrouped,
          ...updatedUngrouped,
        },
      }
      ;
    },
    {
      grouped: {},
      ungrouped: {},
    },
  );

  const groupedPipelineRunCountsByDate = [];
  const ungroupedPipelineRunCountsByDate = [];
  dateRange.forEach(date => {
    groupedPipelineRunCountsByDate.push({
      date,
      ...(allPipelineRunData.grouped[date] || {}),
    });
    ungroupedPipelineRunCountsByDate.push({
      date,
      ...(allPipelineRunData.ungrouped[date] || {}),
    });
  });

  return {
    groupedPipelineRunData: groupedPipelineRunCountsByDate,
    pipelineRunCountByPipelineType: totalPipelineRunCountByPipelineType,
    totalPipelineRunCount,
    ungroupedPipelineRunData: ungroupedPipelineRunCountsByDate,
  };
};
