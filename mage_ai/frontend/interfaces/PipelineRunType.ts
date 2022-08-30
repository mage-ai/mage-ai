
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
  pipeline_schedule_id: string;
  pipeline_uuid: string;
  execution_date: string;
  status: RunStatus;
  block_runs: BlockRunType[];
}
