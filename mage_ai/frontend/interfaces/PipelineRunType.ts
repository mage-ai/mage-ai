import BlockRunType, { RunStatus as RunStatusEnum } from './BlockRunType';
import { ScheduleTypeEnum } from './PipelineScheduleType';

export const RunStatus = RunStatusEnum;

/*
 * LAST_RUN_FAILED_STATUS is a pipeline run status filter used for
 * fetching the last pipeline run retry (or individual pipeline
 * run if there are no retries) that has failed for each grouping
 * of pipeline runs with the same execution date, pipeline uuid,
 * and pipeline schedule ID.
 */
export const LAST_RUN_FAILED_STATUS = 'last_run_failed';

export const PIPELINE_RUN_STATUSES = [
  RunStatus.FAILED,
  LAST_RUN_FAILED_STATUS,
  RunStatus.COMPLETED,
  RunStatus.RUNNING,
  RunStatus.CANCELLED,
  RunStatus.INITIAL,
];

export const PIPELINE_RUN_STATUSES_NO_LAST_RUN_FAILED = [
  RunStatus.FAILED,
  RunStatus.COMPLETED,
  RunStatus.RUNNING,
  RunStatus.CANCELLED,
  RunStatus.INITIAL,
];

export const RUNNING_STATUSES = [
  RunStatus.INITIAL,
  RunStatus.RUNNING,
];

export const COMPLETED_STATUSES = [
  RunStatus.CANCELLED,
  RunStatus.COMPLETED,
  RunStatus.FAILED,
];

export const MAGE_VARIABLES_KEY = '__mage_variables';

export const RUN_STATUS_TO_LABEL = {
  [LAST_RUN_FAILED_STATUS]: 'Last run failed',
  [RunStatus.CANCELLED]: 'Cancelled',
  [RunStatus.COMPLETED]: 'Done',
  [RunStatus.FAILED]: 'Failed',
  [RunStatus.INITIAL]: 'Ready',
  [RunStatus.RUNNING]: 'Running',
};

export interface PipelineRunReqQueryParamsType {
  _limit?: number;
  _offset?: number;
  disable_retries_grouping?: boolean;
  global_data_product_uuid?: string;
  include_all_pipeline_schedules?: boolean;
  include_pipeline_tags?: boolean;
  include_pipeline_uuids?: boolean;
  pipeline_uuid?: string;
  status?: RunStatusEnum;
}

export enum PipelineRunFilterQueryEnum {
  PIPELINE_UUID = 'pipeline_uuid[]',
  STATUS = 'status[]',
  TAG = 'pipeline_tag[]',
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
  backfill_id?: number;
  block_runs?: BlockRunType[];
  block_runs_count?: number;
  completed_block_runs_count?: number;
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
  pipeline_tags?: string[];
  pipeline_uuid?: string;
  repo_path?: string;
  started_at?: string;
  status?: RunStatusEnum;
  updated_at?: string;
  variables?: Obj;
}
