import { RunStatus } from './BlockRunType';

export const BACKFILL_TYPE_DATETIME = 'datetime';
export const BACKFILL_TYPE_CODE = 'code';

export const BackfillStatusEnum = RunStatus;

export enum IntervalTypeEnum {
  SECOND = 'second',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export const INTERVAL_TYPES = [
  // IntervalTypeEnum.SECOND,
  IntervalTypeEnum.MINUTE,
  IntervalTypeEnum.HOUR,
  IntervalTypeEnum.DAY,
  IntervalTypeEnum.WEEK,
  IntervalTypeEnum.MONTH,
  IntervalTypeEnum.YEAR,
  IntervalTypeEnum.CUSTOM,
];

type PipelineRunDateType = {
  ds: string;
  execution_date: string;
  hr: string;
};

export default interface BackfillType {
  block_uuid?: string;
  completed_at?: string;
  created_at: string;
  end_datetime?: string;
  failed_at?: string;
  id: number;
  interval_type?: IntervalTypeEnum;
  interval_units?: number;
  metrics?: {
    [key: string]: number | string;
  };
  name: string;
  pipeline_run_dates?: PipelineRunDateType[];
  pipeline_schedule_id?: number;
  pipeline_uuid: string;
  start_datetime?: string;
  started_at?: string;
  status?: RunStatus;
  total_run_count?: number;
  updated_at?: string;
  variables?: {
    [key: string]: number | string;
  };
}
