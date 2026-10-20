export enum RunStatus {
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FAILED = 'failed',
  INITIAL = 'initial',
  RUNNING = 'running',
  UPSTREAM_FAILED = 'upstream_failed',
  CONDITION_FAILED = 'condition_failed',
}

export interface BlockRunReqQueryParamsType {
  _limit?: number;
  _offset?: number;
  order_by?: string;
  pipeline_run_id?: number;
  pipeline_uuid?: string;
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
