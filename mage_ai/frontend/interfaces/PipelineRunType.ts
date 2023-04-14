import BlockRunType, { RunStatus as RunStatusEnum } from './BlockRunType';
import { ScheduleTypeEnum } from './PipelineScheduleType';

export const RunStatus = RunStatusEnum;

export const RUN_STATUS_TO_LABEL = {
  [RunStatus.CANCELLED]: 'Cancelled',
  [RunStatus.COMPLETED]: 'Done',
  [RunStatus.FAILED]: 'Failed',
  [RunStatus.INITIAL]: 'Ready',
  [RunStatus.RUNNING]: 'Running',
};

export interface PipelineRunReqQueryParamsType {
  _limit?: number;
  _offset?: number;
  pipeline_uuid?: string;
  status?: RunStatusEnum;
}

interface Obj {
  [key: string]: number | string | Obj;
}

interface BlockTagsType {
  destination_table: string;
  index: number;
  stream: string;
  type: string;
  uuid: string;
}

interface PipelineRunErrorType {
  error?: string;
  errors?: string[];
  message?: string;
}

interface PipelineRunMetricsType {
  blocks: {
    [stream: string]: {
      sources: PipelineRunErrorType & {
        block_tags: BlockTagsType;
        record: {
          [column: string]: number | string;
        };
        records: number;
      };
      destinations: PipelineRunErrorType & {
        block_tags: BlockTagsType;
        record: {
          [column: string]: number | string;
        };
        records: number;
        records_affected: number;
        records_inserted: number;
        records_updated: number;
        state: {
          [stream: string]: {
            [column: string]: number | string;
          };
        };
      };
    };
  };
  destination: string;
  pipeline: {
    [stream: string]: {
      bookmarks: {
        [stream: string]: {
          [column: string]: number | string;
        };
      };
      number_of_batches: number;
      record_counts: number;
    };
  };
  source: string;
}

export type PipelineRunDateType = {
  ds: string;
  execution_date: string;
  hr: string;
};

export default interface PipelineRunType {
  block_runs?: BlockRunType[];
  block_runs_count?: number;
  completed_at?: string;
  created_at?: string;
  event_variables?: Obj;
  execution_date?: string;
  id?: number;
  metrics?: PipelineRunMetricsType;
  passed_sla?: boolean;
  pipeline_schedule_id?: number;
  pipeline_schedule_name?: string;
  pipeline_schedule_token?: string;
  pipeline_schedule_type?: ScheduleTypeEnum;
  pipeline_uuid?: string;
  status?: RunStatusEnum;
  updated_at?: string;
  variables?: Obj;
}
