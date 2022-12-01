import BlockRunType, { RunStatus as RunStatusEnum } from './BlockRunType';

export const RunStatus = RunStatusEnum;

export const RUN_STATUS_TO_LABEL = {
  [RunStatus.COMPLETED]: 'Done',
  [RunStatus.CANCELLED]: 'Cancelled',
  [RunStatus.FAILED]: 'Failed',
  [RunStatus.RUNNING]: 'Running',
  [RunStatus.INITIAL]: 'Ready',
};

export interface PipelineRunReqQueryParamsType {
  _limit?: number;
  _offset?: number;
  pipeline_uuid?: string;
  status?: RunStatusEnum;
}

interface Obj {
  [key: string]: string | Obj;
}

export default interface PipelineRunType {
  block_runs?: BlockRunType[];
  block_runs_count?: number;
  completed_at?: string;
  created_at?: string;
  event_variables?: Obj;
  execution_date?: string;
  id?: number;
  pipeline_schedule_id?: number;
  pipeline_schedule_name?: string;
  pipeline_uuid?: string;
  status?: RunStatusEnum;
  updated_at?: string;
  variables?: Obj;
}
