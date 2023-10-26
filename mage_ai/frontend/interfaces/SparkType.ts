export enum SparkJobStatusEnum {
  FAILED = 'FAILED',
  SUCCEEDED = 'SUCCEEDED',
}

export enum SparkStageStatusEnum {
  COMPLETE = 'COMPLETE',
}

export enum SparkTaskLocalityEnum {
  NODE_LOCAL = 'NODE_LOCAL',
  PROCESS_LOCAL = 'PROCESS_LOCAL',
}

export enum SparkTaskStatusEnum {
  SUCCESS = 'SUCCESS',
}

export enum SparkSQLStatusEnum {
  COMPLETED = 'COMPLETED',
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

export interface InputMetricsType {
  bytes_read: number[];
  records_read: number[];
}

export interface OutputMetricsType {
  bytes_written: number[];
  records_written: number[];
}

export interface ShuffleReadMetricsType {
  fetch_wait_time: number[];
  local_blocks_fetched: number[];
  local_bytes_read?: number;
  read_bytes: number[];
  read_records: number[];
  remote_blocks_fetched: number[];
  remote_bytes_read: number[];
  remote_bytes_read_to_disk: number[];
  remote_reqs_duration: number[];
  shuffle_push_read_metrics_dist: {
    corrupt_merged_block_chunks: number[];
    local_merged_blocks_fetched: number[];
    local_merged_bytes_read: number[];
    local_merged_chunks_fetched: number[];
    merged_fetch_fallback_count: number[];
    remote_merged_blocks_fetched: number[];
    remote_merged_bytes_read: number[];
    remote_merged_chunks_fetched: number[];
    remote_merged_reqs_duration: number[];
  };
  total_blocks_fetched: number[];
}

export interface TaskMetricsDistributionsType {
  disk_bytes_spilled: number[];
  duration: number[];
  executor_cpu_time: number[];
  executor_deserialize_cpu_time: number[];
  executor_deserialize_time: number[];
  executor_run_time: number[];
  getting_result_time: number[];
  input_metrics: InputMetricsType;
  jvm_gc_time: number[];
  memory_bytes_spilled: number[];
  output_metrics: OutputMetricsType;
  peak_execution_memory: number[];
  quantiles: number[];
  result_serialization_time: number[];
  result_size: number[];
  scheduler_delay: number[];
  shuffle_read_metrics: ShuffleReadMetricsType;
  shuffle_write_metrics: {
    write_bytes: number[];
    write_records: number[];
    write_time: number[];
  };
}

export interface SparkTaskType {
  accumulator_updates: string[];
  attempt: number;
  duration: number;
  executor_id: string;
  executor_logs: {
    [key: string]: any;
  };
  getting_result_time: number;
  host: string;
  index: number;
  input_metrics: InputMetricsType;
  launch_time: string;
  output_metrics: OutputMetricsType;
  partition_id: number;
  scheduler_delay: number
  shuffle_read_metrics: ShuffleReadMetricsType;
  shuffle_write_metrics: {
    bytes_written: number;
    records_written: number;
    write_time: number;
  };
  speculative: boolean;
  status: SparkTaskStatusEnum;
  task_id: number;
  task_locality: SparkTaskLocalityEnum;
  task_metrics: {
    disk_bytes_spilled: number;
    executor_cpu_time: number;
    executor_deserialize_cpu_time: number;
    executor_deserialize_time: number;
    executor_run_time: number;
    jvm_gc_time: number;
    memory_bytes_spilled: number;
    peak_execution_memory: number;
    result_serialization_time: number;
    result_size: number;
    shuffle_read_metrics: {
      fetch_wait_time: number;
      local_blocks_fetched: number;
      local_bytes_read: number;
      records_read: number;
      remote_blocks_fetched: number;
      remote_bytes_read: number;
      remote_bytes_read_to_disk: number;
      remote_reqs_duration: number;
      shuffle_push_read_metrics: {
        corrupt_merged_block_chunks: number;
        local_merged_blocks_fetched: number;
        local_merged_bytes_read: number;
        local_merged_chunks_fetched: number;
        merged_fetch_fallback_count: number;
        remote_merged_blocks_fetched: number;
        remote_merged_bytes_read: number;
        remote_merged_chunks_fetched: number;
        remote_merged_reqs_duration: number;
      };
    };
    shuffle_write_metrics: {
      bytes_written: number;
      records_written: number;
      write_time: number;
    };
  };
}

export interface SparkStageAttemptType {
  attempt_id: number;
  executor_metrics_distributions: {
    disk_bytes_spilled: number[];
    failed_tasks: number[];
    input_bytes: number[];
    input_records: number[];
    killed_tasks: number[];
    memory_bytes_spilled: number[];
    output_bytes: number[];
    output_records: number[];
    quantiles: number[];
    peak_memory_metrics: {
      direct_pool_memory: number[];
      jvm_heap_memory: number[];
      jvm_off_heap_memory: number[];
      major_gc_count: number[];
      major_gc_time: number[];
      mapped_pool_memory: number[];
      minor_gc_count: number[];
      minor_gc_time: number[];
      off_heap_execution_memory: number[];
      off_heap_storage_memory: number[];
      off_heap_unified_memory: number[];
      on_heap_execution_memory: number[];
      on_heap_storage_memory: number[];
      on_heap_unified_memory: number[];
      process_tree_jvmrss_memory: number[];
      process_tree_jvmv_memory: number[];
      process_tree_other_rss_memory: number[];
      process_tree_other_v_memory: number[];
      process_tree_python_rss_memory: number[];
      process_tree_python_v_memory: number[];
      total_gc_time: number[];
    },
    shuffle_read: number[];
    shuffle_read_records: number[];
    shuffle_write: number[];
    shuffle_write_records: number[];
    succeeded_tasks: number[];
    task_time: number[];
  };
  submission_time: string;
  task_metrics_distributions: TaskMetricsDistributionsType;
  tasks: {
    [task_id: string]: SparkTaskType;
  };
}

export interface SparkStageType extends SparkStageAttemptType {
  attempt_id: number;
  completion_time: string;
  details: string;
  failure_reason: string;
  first_task_launched_time: string;
  input_bytes: number;
  input_records: number;
  name: string;
  num_active_tasks: number;
  num_complete_tasks: number;
  num_completed_indices: number;
  num_failed_tasks: number;
  num_killed_tasks: number;
  num_tasks: number;
  output_bytes: number;
  output_records: number;
  peak_executor_metrics: PeakExecutorMetricsType;
  rdd_ids: number[];
  resource_profile_id: number;
  result_serialization_time: number;
  result_size: number;
  scheduling_pool: number;
  shuffle_corrupt_merged_block_chunks: number;
  shuffle_fetch_wait_time: number;
  shuffle_local_blocks_fetched: number;
  shuffle_local_bytes_read: number;
  shuffle_merged_fetch_fallback_count: number;
  shuffle_merged_local_blocks_fetched: number;
  shuffle_merged_local_bytes_read: number;
  shuffle_merged_local_chunks_fetched: number;
  shuffle_merged_remote_blocks_fetched: number;
  shuffle_merged_remote_bytes_read: number;
  shuffle_merged_remote_chunks_fetched: number;
  shuffle_merged_remote_reqs_duration: number;
  shuffle_mergers_count: number;
  shuffle_read_bytes: number;
  shuffle_read_records: number;
  shuffle_remote_blocks_fetched: number;
  shuffle_remote_bytes_read: number;
  shuffle_remote_bytes_read_to_disk: number;
  shuffle_remote_reqs_duration: number;
  shuffle_write_bytes: number;
  shuffle_write_records: number;
  shuffle_write_time: number;
  stage_attempts?: SparkStageAttemptType[];
  stage_id: number;
  status: SparkStageStatusEnum;
  submission_time: string;
}

export interface ExecutorResourceType {
  amount: number;
  discovery_script: string;
  resource_name: string;
  vendor: string;
}

export interface SparkEnvironmentType {
  classpath_entries: string[][];
  hadoop_properties: string[][];
  metrics_properties: string[][];
  resource_profiles: {
    executor_resources: {
      cores: ExecutorResourceType;
      memory: ExecutorResourceType;
      off_heap: ExecutorResourceType;
    };
    id: number;
    task_resources: {
      cpus: ExecutorResourceType;
    };
  }[];
  runtime: {
    java_home: string;
    java_version: string;
    scala_version: string;
  };
  spark_properties: string[][];
  system_properties: string[][];
}

export interface SparkExecutorType {
  active_tasks: number;
  add_time: string;
  attributes: { [key: string]: string };
  blacklisted_in_stages: number[];
  completed_tasks: number;
  disk_used: number;
  excluded_in_stages: number[];
  executor_logs: { [key: string]: string };
  failed_tasks: number;
  host_port: string;
  id: string;
  is_active: boolean;
  is_blacklisted: boolean;
  is_excluded: boolean;
  max_memory: number;
  max_tasks: number;
  memory_metrics: {
    total_off_heap_storage_memory: number;
    total_on_heap_storage_memory: number;
    used_off_heap_storage_memory: number;
    used_on_heap_storage_memory: number;
  };
  memory_used: number;
  peak_memory_metrics: {
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
  };
  rdd_blocks: number;
  resource_profile_id: number;
  resources: { [key: string]: string };
  total_cores: number;
  total_duration: number;
  total_gc_time: number;
  total_input_bytes: number;
  total_shuffle_read: number;
  total_shuffle_write: number;
  total_tasks: number;
}

export interface SparkSQLEdgeType {
  from_id: number;
  to_id: number;
}

export interface SparkSQLNodeMetricType {
  name: string;
  value: string;
}

export interface SparkSQLNodeType {
  metrics: SparkSQLNodeMetricType[];
  node_id: number;
  node_name: string;
  whole_stage_codegen_id: number;
}

export interface SparkSQLType {
  description: string;
  duration: number;
  edges: SparkSQLEdgeType[];
  failed_job_ids: number[];
  id: number;
  jobs?: SparkJobType[];
  nodes: SparkSQLNodeType[];
  plan_description: string;
  running_job_ids: number[];
  stages?: SparkStageAttemptType[];
  status: SparkSQLStatusEnum;
  submission_time: string;
  success_job_ids: number[];
}
