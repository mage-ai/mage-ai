export enum SparkJobStatusEnum {
  SUCCEEDED = 'SUCCEEDED',
}

export interface SparkApplicationType {
  attempts: {
    app_spark_version: string;
    completed: boolean,
    duration: number,
    end_time: string;
    end_time_epoch: number,
    last_updated: string;
    last_updated_epoch: number,
    spark_user: string;
    start_time: string;
    start_time_epoch: number
  }[];
  id: string;
  name: string;
}

export interface SparkJobType {
  completion_time: string;
  job_id: id;
  job_tags: string[];
  killed_tasks_summary: {
    [key: string]: any;
  };
  name: string;
  num_active_stages: number;
  num_active_tasks: number;
  num_completed_indices: number;
  num_completed_stages: number;
  num_completed_tasks: number;
  num_failed_stages: number;
  num_failed_tasks: number;
  num_killed_tasks: number;
  num_skipped_stages: number;
  num_skipped_tasks: number;
  num_tasks: number;
  stage_ids: number[];
  status: SparkJobStatusEnum;
  submission_time: string;
}
