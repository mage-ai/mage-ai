import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';

export enum MonitorStatsEnum {
  BLOCK_RUN_COUNT = 'block_run_count',
  BLOCK_RUN_TIME = 'block_run_time',
  PIPELINE_RUN_COUNT = 'pipeline_run_count',
  PIPELINE_RUN_TIME = 'pipeline_run_time',
}

export type RunStatusCountType = {
  [RunStatusEnum.CANCELLED]?: number;
  [RunStatusEnum.COMPLETED]?: number;
  [RunStatusEnum.FAILED]?: number;
  [RunStatusEnum.INITIAL]?: number;
  [RunStatusEnum.RUNNING]?: number;
};

export const RUN_STATUSES_TO_DISPLAY = [
  RunStatusEnum.RUNNING,
  RunStatusEnum.COMPLETED,
  RunStatusEnum.FAILED,
];

export type GroupedPipelineRunCountType = {
  [PipelineTypeEnum.INTEGRATION]?: RunStatusCountType;
  [PipelineTypeEnum.PYTHON]?: RunStatusCountType;
  [PipelineTypeEnum.PYSPARK]?: RunStatusCountType;
  [PipelineTypeEnum.STREAMING]?: RunStatusCountType;
};

export type RunCountStatsType = {
  [key: string]: {                  // pipeline_schedule_id
    data: {
      [key: string]: {              // YYYY-MM-DD date
        [key: string]: number | {   // pipeline run status or pipeline type
          [key: string]: number;    // pipeline run status (if "group_by_pipeline_type" included in query)
        };
      };
    };
    name: string;
  };
};

export type RunTimeStatsType = {
  [key: string]: {
    data: {
      [key: string]: number;
    };
    name: string;
  };
};

export default interface MonitorStatsType {
  stats: RunCountStatsType | RunTimeStatsType;
  stats_type: MonitorStatsEnum;
}
