export enum RunStatus {
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FAILED = 'failed',
  INITIAL = 'initial',
  RUNNING = 'running',
}

export interface BlockRunType {
  block_uuid: string;
  pipeline_run_id: string;
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
