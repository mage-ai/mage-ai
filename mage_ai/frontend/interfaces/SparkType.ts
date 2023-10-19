export enum SparkJobStatusEnum {
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
  bytesRead: number[];
  recordsRead: number[];
}

export interface OutputMetricsType {
  bytesWritten: number[];
  recordsWritten: number[];
}

export interface ShuffleReadMetricsType {
  fetchWaitTime: number[];
  localBlocksFetched: number[];
  localBytesRead?: number;
  readBytes: number[];
  readRecords: number[];
  remoteBlocksFetched: number[];
  remoteBytesRead: number[];
  remoteBytesReadToDisk: number[];
  remoteReqsDuration: number[];
  shufflePushReadMetricsDist: {
    corruptMergedBlockChunks: number[];
    localMergedBlocksFetched: number[];
    localMergedBytesRead: number[];
    localMergedChunksFetched: number[];
    mergedFetchFallbackCount: number[];
    remoteMergedBlocksFetched: number[];
    remoteMergedBytesRead: number[];
    remoteMergedChunksFetched: number[];
    remoteMergedReqsDuration: number[];
  };
  totalBlocksFetched: number[];
}

export interface TaskMetricsDistributionsType {
  diskBytesSpilled: number[];
  duration: number[];
  executorCpuTime: number[];
  executorDeserializeCpuTime: number[];
  executorDeserializeTime: number[];
  executorRunTime: number[];
  gettingResultTime: number[];
  inputMetrics: InputMetricsType;
  jvmGcTime: number[];
  memoryBytesSpilled: number[];
  outputMetrics: OutputMetricsType;
  peakExecutionMemory: number[];
  quantiles: number[];
  resultSerializationTime: number[];
  resultSize: number[];
  schedulerDelay: number[];
  shuffleReadMetrics: ShuffleReadMetricsType;
  shuffleWriteMetrics: {
    writeBytes: number[];
    writeRecords: number[];
    writeTime: number[];
  };
}

export interface SparkTaskType {
  accumulatorUpdates: string[];
  attempt: number;
  duration: number;
  executorId: string;
  executorLogs: {
    [key: string]: any;
  };
  gettingResultTime: number;
  host: string;
  index: number;
  inputMetrics: InputMetricsType;
  launchTime: string;
  outputMetrics: OutputMetricsType;
  partitionId: number;
  schedulerDelay: number
  shuffleReadMetrics: ShuffleReadMetricsType;
  shuffleWriteMetrics: {
    bytesWritten: number;
    recordsWritten: number;
    writeTime: number;
  };
  speculative: boolean;
  status: SparkTaskStatusEnum;
  taskId: number;
  taskLocality: SparkTaskLocalityEnum;
  taskMetrics: {
    diskBytesSpilled: number;
    executorCpuTime: number;
    executorDeserializeCpuTime: number;
    executorDeserializeTime: number;
    executorRunTime: number;
    jvmGcTime: number;
    memoryBytesSpilled: number;
    peakExecutionMemory: number;
    resultSerializationTime: number;
    resultSize: number;
  };
}

export interface SparkStageAttemptType {
  attemptId: number;
  executorMetricsDistributions: {
    diskBytesSpilled: number[];
    failedTasks: number[];
    inputBytes: number[];
    inputRecords: number[];
    killedTasks: number[];
    memoryBytesSpilled: number[];
    outputBytes: number[];
    outputRecords: number[];
    quantiles: number[];
    peakMemoryMetrics: {
      DirectPoolMemory: number[];
      JVMHeapMemory: number[];
      JVMOffHeapMemory: number[];
      MajorGCCount: number[];
      MajorGCTime: number[];
      MappedPoolMemory: number[];
      MinorGCCount: number[];
      MinorGCTime: number[];
      OffHeapExecutionMemory: number[];
      OffHeapStorageMemory: number[];
      OffHeapUnifiedMemory: number[];
      OnHeapExecutionMemory: number[];
      OnHeapStorageMemory: number[];
      OnHeapUnifiedMemory: number[];
      ProcessTreeJVMRSSMemory: number[];
      ProcessTreeJVMVMemory: number[];
      ProcessTreeOtherRSSMemory: number[];
      ProcessTreeOtherVMemory: number[];
      ProcessTreePythonRSSMemory: number[];
      ProcessTreePythonVMemory: number[];
      TotalGCTime: number[];
    },
    shuffleRead: number[];
    shuffleReadRecords: number[];
    shuffleWrite: number[];
    shuffleWriteRecords: number[];
    succeededTasks: number[];
    taskTime: number[];
  };
  taskMetricsDistributions: TaskMetricsDistributionsType;
  tasks: {
    [task_id: string]: SparkTaskType;
  };
}

export interface SparkStageType extends SparkStageAttemptType {
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
  spark_properties: string[][];
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
