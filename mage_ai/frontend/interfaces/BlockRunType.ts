export enum RunStatus {
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FAILED = 'failed',
  INITIAL = 'initial',
  RUNNING = 'running',
}

export default interface BlockRunType {
  block_uuid: string;
  completed_at?: string;
  created_at: string;
  id: number;
  pipeline_run_id: number;
  pipeline_schedule_id?: number;
  pipeline_schedule_name?: string;
  started_at?: string;
  status: RunStatus;
  updated_at?: string;
}
