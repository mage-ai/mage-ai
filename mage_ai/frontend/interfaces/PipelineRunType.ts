export enum RunStatus {
  INITIAL = 'initial',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface BlockRunType {
  pipeline_run_id: string;
  block_uuid: string;
  status: RunStatus;
}

export default interface PipelineRunType {
  block_runs?: BlockRunType[];
  block_runs_count?: number;
  created_at: string;
  execution_date: string;
  id: number;
  pipeline_schedule_id: number;
  pipeline_schedule_name: string;
  pipeline_uuid: string;
  status: RunStatus;
  updated_at: string;
}
