export enum RunStatus {
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FAILED = 'failed',
  INITIAL = 'initial',
  RUNNING = 'running',
  UPSTREAM_FAILED = 'upstream_failed',
  CONDITION_FAILED = 'condition_failed',
}
export const BLOCK_RUN_STATUSES = [
  RunStatus.FAILED,
  RunStatus.UPSTREAM_FAILED,
  RunStatus.CONDITION_FAILED,
  RunStatus.COMPLETED,
  RunStatus.RUNNING,
  RunStatus.CANCELLED,
  RunStatus.INITIAL,
];

export const BLOCK_RUN_STATUS_TO_LABEL = {
  [RunStatus.CANCELLED]: 'Cancelled',
  [RunStatus.COMPLETED]: 'Done',
  [RunStatus.CONDITION_FAILED]: 'Condition failed',
  [RunStatus.FAILED]: 'Failed',
  [RunStatus.INITIAL]: 'Ready',
  [RunStatus.RUNNING]: 'Running',
  [RunStatus.UPSTREAM_FAILED]: 'Upstream failed',
};

export interface BlockRunReqQueryParamsType {
  _limit?: number;
  _offset?: number;
  order_by?: string;
  pipeline_run_id?: number;
  pipeline_uuid?: string;
  status?: RunStatus;
}

export enum BlockRunFilterQueryEnum {
  PIPELINE_UUID = 'pipeline_uuid[]',
  STATUS = 'status[]',
}

export default interface BlockRunType {
  block_uuid: string;
  completed_at?: string;
  created_at: string;
  id: number;
  metrics?: {
    error?: {
      error: string;
      errors: string[];
      message: string;
    };
  };
  pipeline_run_id: number;
  pipeline_schedule_id?: number;
  pipeline_schedule_name?: string;
  started_at?: string;
  status: RunStatus;
  updated_at?: string;
}
