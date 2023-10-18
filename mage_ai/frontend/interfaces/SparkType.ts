export enum SparkJobStatusEnum {
  SUCCEEDED = 'SUCCEEDED',
}

export enum SparkStageStatusEnum {
  COMPLETE = 'COMPLETE',
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
  job_id: number;
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

export interface PeakExecutorMetricsType {
  direct_pool_memory: number;
  jvm_heap_memory: number;
  jvm_off_heap_memory: number;
  major_gc_count: number;
  major_gc_time: number;
  mapped_pool_memory: number;
  minor_gc_count: number;
  minor_gc_time: number;
  off_heap_execution_memory: number;
  off_heap_storage_memory: number;
  off_heap_unified_memory: number;
  on_heap_execution_memory: number;
  on_heap_storage_memory: number;
  on_heap_unified_memory: number;
  process_tree_jvmrss_memory: number;
  process_tree_jvmv_memory: number;
  process_tree_other_rss_memory: number;
  process_tree_other_v_memory: number;
  process_tree_python_rss_memory: number;
  process_tree_python_v_memory: number;
  total_gc_time: number;
}

export interface SparkStageType {
  attempt_id: number;
  completion_time: string;
  details: string;
  first_task_launched_time: string;
  name: string;
  num_active_tasks: number;
  num_complete_tasks: number;
  num_completed_indices: number;
  num_failed_tasks: number;
  num_killed_tasks: number;
  num_tasks: number;
  peak_executor_metrics: PeakExecutorMetricsType;
  rdd_ids: number[];
  stage_id: number;
  status: SparkStageStatusEnum;
  submission_time: string;
}
