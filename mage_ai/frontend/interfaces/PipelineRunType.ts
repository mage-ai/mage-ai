import BlockRunType, { RunStatus as RunStatusEnum } from './BlockRunType';

export const RunStatus = RunStatusEnum;

export default interface PipelineRunType {
  block_runs?: BlockRunType[];
  block_runs_count?: number;
  completed_at: string;
  created_at: string;
  execution_date: string;
  id: number;
  pipeline_schedule_id: number;
  pipeline_schedule_name: string;
  pipeline_uuid: string;
  status: RunStatusEnum;
  updated_at: string;
  variables?: {
    [key: string]: string;
  };
}
