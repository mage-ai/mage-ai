from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List

from mage_ai.services.spark.models.base import BaseSparkModel
from mage_ai.services.spark.models.metrics import Metrics


class Locality(str, Enum):
    NODE_LOCAL = 'NODE_LOCAL'
    PROCESS_LOCAL = 'PROCESS_LOCAL'


class StageStatus(str, Enum):
    COMPLETE = 'COMPLETE'


class TaskStatus(str, Enum):
    SUCCESS = 'SUCCESS'


@dataclass
class Driver(BaseSparkModel):
    disk_bytes_spilled: int = None  # 0
    failed_tasks: int = None  # 0
    input_bytes: int = None  # 0
    input_records: int = None  # 0
    is_blacklisted_for_stage: bool = None  # false
    is_excluded_for_stage: bool = None  # false
    killed_tasks: int = None  # 0
    memory_bytes_spilled: int = None  # 0
    output_bytes: int = None  # 0
    output_records: int = None  # 0
    peak_memory_metrics: Metrics = None  # {}
    shuffle_read: int = None  # 59
    shuffle_read_records: int = None  # 1
    shuffle_write: int = None  # 0
    shuffle_write_records: int = None  # 0
    succeeded_tasks: int = None  # 1
    task_time: int = None  # 11

    def __post_init__(self):
        if self.peak_memory_metrics:
            self.peak_memory_metrics = Metrics.load(**self.peak_memory_metrics)


@dataclass
class ExecutorSummary(BaseSparkModel):
    driver: Driver = None

    def __post_init__(self):
        if self.driver:
            self.driver = Driver.load(**self.driver)


@dataclass
class InputMetrics(BaseSparkModel):
    bytes_read: int = None  # 0
    records_read: int = None  # 0


@dataclass
class InputMetricsQuantile(BaseSparkModel):
    bytes_read: List[int] = field(default_factory=list)
    records_read: List[int] = field(default_factory=list)


@dataclass
class OutputMetricsQuantile(BaseSparkModel):
    bytes_written: List[int] = field(default_factory=list)
    records_written: List[int] = field(default_factory=list)


@dataclass
class ShufflePushReadMetricsDistQuantile(BaseSparkModel):
    corrupt_merged_block_chunks: List[int] = field(default_factory=list)
    local_merged_blocks_fetched: List[int] = field(default_factory=list)
    local_merged_bytes_read: List[int] = field(default_factory=list)
    local_merged_chunks_fetched: List[int] = field(default_factory=list)
    merged_fetch_fallback_count: List[int] = field(default_factory=list)
    remote_merged_blocks_fetched: List[int] = field(default_factory=list)
    remote_merged_bytes_read: List[int] = field(default_factory=list)
    remote_merged_chunks_fetched: List[int] = field(default_factory=list)
    remote_merged_reqs_duration: List[int] = field(default_factory=list)


@dataclass
class ShuffleReadMetricsQuantile(BaseSparkModel):
    fetch_wait_time: List[int] = field(default_factory=list)
    local_blocks_fetched: List[int] = field(default_factory=list)
    read_bytes: List[int] = field(default_factory=list)
    read_records: List[int] = field(default_factory=list)
    remote_blocks_fetched: List[int] = field(default_factory=list)
    remote_bytes_read: List[int] = field(default_factory=list)
    remote_bytes_read_to_disk: List[int] = field(default_factory=list)
    remote_reqs_duration: List[int] = field(default_factory=list)
    shuffle_push_read_metrics_dist: ShufflePushReadMetricsDistQuantile = None
    total_blocks_fetched: List[int] = field(default_factory=list)

    def __post_init__(self):
        if self.shuffle_push_read_metrics_dist:
            self.shuffle_push_read_metrics_dist = ShufflePushReadMetricsDistQuantile.load(
                **self.shuffle_push_read_metrics_dist,
            )


@dataclass
class ShuffleWriteMetricsQuantile(BaseSparkModel):
    write_bytes: List[int] = field(default_factory=list)
    write_records: List[int] = field(default_factory=list)
    write_time: List[int] = field(default_factory=list)


@dataclass
class OutputMetrics(BaseSparkModel):
    bytes_written: int  # 0
    records_written: int  # 0


@dataclass
class PushReadMetrics(BaseSparkModel):
    corrupt_merged_block_chunks: int = None  # 0
    local_merged_blocks_fetched: int = None  # 0
    local_merged_bytes_read: int = None  # 0
    local_merged_chunks_fetched: int = None  # 0
    merged_fetch_fallback_count: int = None  # 0
    remote_merged_blocks_fetched: int = None  # 0
    remote_merged_bytes_read: int = None  # 0
    remote_merged_chunks_fetched: int = None  # 0
    remote_merged_reqs_duration: int = None  # 0


@dataclass
class ShuffleReadMetrics(BaseSparkModel):
    fetch_wait_time: int = None  # 0
    local_blocks_fetched: int = None  # 1
    local_bytes_read: int = None  # 59
    records_read: int = None  # 1
    remote_blocks_fetched: int = None  # 0
    remote_bytes_read: int = None  # 0
    remote_bytes_read_to_disk: int = None  # 0
    remote_reqs_duration: int = None  # 0
    shuffle_push_read_metrics: PushReadMetrics = None

    def __post_init__(self):
        if self.shuffle_push_read_metrics:
            self.shuffle_push_read_metrics = PushReadMetrics.load(**self.shuffle_push_read_metrics)


@dataclass
class ShuffleWriteMetrics(BaseSparkModel):
    bytes_written: int = None  # 0
    records_written: int = None  # 0
    write_time: int = None  # 0


@dataclass
class TaskMetricsQuantiles(BaseSparkModel):
    disk_bytes_spilled: List[int] = field(default_factory=list)
    duration: List[int] = field(default_factory=list)
    executor_cpu_time: List[int] = field(default_factory=list)
    executor_deserialize_cpu_time: List[int] = field(default_factory=list)
    executor_deserialize_time: List[int] = field(default_factory=list)
    executor_run_time: List[int] = field(default_factory=list)
    getting_result_time: List[int] = field(default_factory=list)
    input_metrics: InputMetricsQuantile = None
    jvm_gc_time: List[int] = field(default_factory=list)
    memory_bytes_spilled: List[int] = field(default_factory=list)
    output_metrics: OutputMetricsQuantile = None
    peak_execution_memory: List[int] = field(default_factory=list)
    quantiles: List[int] = field(default_factory=list)
    result_serialization_time: List[int] = field(default_factory=list)
    result_size: List[int] = field(default_factory=list)
    scheduler_delay: List[int] = field(default_factory=list)
    shuffle_read_metrics: ShuffleReadMetricsQuantile = None
    shuffle_write_metrics: ShuffleWriteMetricsQuantile = None

    def __post_init__(self):
        if self.input_metrics:
            self.input_metrics = InputMetricsQuantile.load(**self.input_metrics)

        if self.output_metrics:
            self.output_metrics = OutputMetricsQuantile.load(**self.output_metrics)

        if self.shuffle_read_metrics:
            self.shuffle_read_metrics = ShuffleReadMetricsQuantile.load(**self.shuffle_read_metrics)

        if self.shuffle_write_metrics:
            self.shuffle_write_metrics = ShuffleWriteMetricsQuantile.load(
                **self.shuffle_write_metrics,
            )


@dataclass
class TaskMetrics(BaseSparkModel):
    disk_bytes_spilled: int = None  # 0
    executor_cpu_time: int = None  # 1442666
    executor_deserialize_cpu_time: int = None  # 988667
    executor_deserialize_time: int = None  # 0
    executor_run_time: int = None  # 8
    input_metrics: InputMetrics = None
    jvm_gc_time: int = None  # 0
    memory_bytes_spilled: int = None  # 0
    output_metrics: OutputMetrics = None
    peak_execution_memory: int = None  # 0
    result_serialization_time: int = None  # 0
    result_size: int = None  # 3952
    shuffle_read_metrics: ShuffleReadMetrics = None
    shuffle_write_metrics: ShuffleWriteMetrics = None

    def __post_init__(self):
        if self.input_metrics:
            self.input_metrics = InputMetrics.load(**self.input_metrics)
        if self.output_metrics:
            self.output_metrics = OutputMetrics.load(**self.output_metrics)
        if self.shuffle_read_metrics:
            self.shuffle_read_metrics = ShuffleReadMetrics.load(**self.shuffle_read_metrics)
        if self.shuffle_write_metrics:
            self.shuffle_write_metrics = ShuffleWriteMetrics.load(**self.shuffle_write_metrics)


@dataclass
class ExecutorMetricsDistributions(BaseSparkModel):
    disk_bytes_spilled: List[int] = field(default_factory=list)
    failed_tasks: List[int] = field(default_factory=list)
    input_bytes: List[int] = field(default_factory=list)
    input_records: List[int] = field(default_factory=list)
    killed_tasks: List[int] = field(default_factory=list)
    memory_bytes_spilled: List[int] = field(default_factory=list)
    output_bytes: List[int] = field(default_factory=list)
    output_records: List[int] = field(default_factory=list)
    peak_memory_metrics: Metrics = None
    quantiles: List[int] = field(default_factory=list)
    shuffle_read: List[int] = field(default_factory=list)
    shuffle_read_records: List[int] = field(default_factory=list)
    shuffle_write: List[int] = field(default_factory=list)
    shuffle_write_records: List[int] = field(default_factory=list)
    succeeded_tasks: List[int] = field(default_factory=list)
    task_time: List[int] = field(default_factory=list)

    def __post_init__(self):
        if self.peak_memory_metrics:
            self.peak_memory_metrics = Metrics(**self.peak_memory_metrics)


@dataclass
class Task(BaseSparkModel):
    accumulator_updates: int = None  # []
    attempt: int = None  # 0
    duration: int = None  # 11
    executor_id: str = None  # "driver"
    executor_logs: Dict = field(default_factory=dict)  # {}
    getting_result_time: int = None  # 0
    host: str = None  # "fecb8bf9abfc"
    index: int = None  # 0
    launch_time: str = None  # "2023-10-15T10:17:00.761GMT"
    partition_id: int = None  # 0
    scheduler_delay: int = None  # 3
    speculative: bool = None  # false
    status: TaskStatus = None  # "SUCCESS"
    task_id: int = None  # 54
    task_locality: Locality = None  # "NODE_LOCAL"
    task_metrics: TaskMetrics = None  # {}

    def __post_init__(self):
        if self.status:
            try:
                self.status = TaskStatus(self.status)
            except ValueError as err:
                print(f'[WARNING] Task: {err}')
                self.status = self.status

        if self.task_locality:
            try:
                self.task_locality = Locality(self.task_locality)
            except ValueError as err:
                print(f'[WARNING] Task: {err}')
                self.task_locality = self.task_locality

        if self.task_metrics:
            self.task_metrics = TaskMetrics.load(**self.task_metrics)

    @property
    def id(self) -> int:
        return self.task_id


@dataclass
class StageBase(BaseSparkModel):
    accumulator_updates: List[str] = field(default_factory=list)  # []
    attempt_id: int = None  # 0
    completion_time: str = None  # "2023-10-15T10:17:00.772GMT"
    # org.apache.spark.sql.Dataset.count(Dataset.scala:3625)
    # java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    # java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke
    #   (NativeMethodAccessorImpl.java:62)
    # java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke
    #   (DelegatingMethodAccessorImpl.java:43)
    # java.base/java.lang.reflect.Method.invoke(Method.java:566)
    # py4j.reflection.MethodInvoker.invoke(MethodInvoker.java:244)
    # py4j.reflection.ReflectionEngine.invoke(ReflectionEngine.java:374)
    # py4j.Gateway.invoke(Gateway.java:282)
    # py4j.commands.AbstractCommand.invokeMethod(AbstractCommand.java:132)
    # py4j.commands.CallCommand.execute(CallCommand.java:79)
    # py4j.ClientServerConnection.waitForCommands(ClientServerConnection.java:182)
    # py4j.ClientServerConnection.run(ClientServerConnection.java:106)
    # java.base/java.lang.Thread.run(Thread.java:829)
    details: str = None
    disk_bytes_spilled: int = None   # 0
    executor_metrics_distributions: ExecutorMetricsDistributions = None
    executor_cpu_time: int = None   # 1442666
    executor_deserialize_cpu_time: int = None  # 988667
    executor_deserialize_time: int = None  # 0
    executor_run_time: int = None  # 8
    failure_reason: str = None
    first_task_launched_time: str = None  # "2023-10-15T10:17:00.761GMT"
    input_bytes: int = None  # 0
    input_records: int = None  # 0
    is_shuffle_push_enabled: bool = None  # false
    jvm_gc_time: int = None  # 0
    killed_tasks_summary: Dict = field(default_factory=dict)  # {}
    memory_bytes_spilled: int = None  # 0
    name: str = None  # "count at NativeMethodAccessorImpl.java:0"
    num_active_tasks: int = None  # 0
    num_complete_tasks: int = None  # 1
    num_completed_indices: int = None  # 1
    num_failed_tasks: int = None  # 0
    num_killed_tasks: int = None  # 0
    num_tasks: int = None  # 1
    output_bytes: int = None  # 0
    output_records: int = None  # 0
    peak_execution_memory: int = None  # 0
    peak_executor_metrics: Metrics = None  # {}
    rdd_ids: List[int] = None  # [227, 225, 226]
    resource_profile_id: int = None  # 0
    result_serialization_time: int = None  # 0
    result_size: int = None  # 3952
    scheduling_pool: str = None  # "default"
    shuffle_corrupt_merged_block_chunks: int = None  # 0
    shuffle_fetch_wait_time: int = None  # 0
    shuffle_local_blocks_fetched: int = None  # 1
    shuffle_local_bytes_read: int = None  # 59
    shuffle_merged_fetch_fallback_count: int = None  # 0
    shuffle_merged_local_blocks_fetched: int = None  # 0
    shuffle_merged_local_bytes_read: int = None  # 0
    shuffle_merged_local_chunks_fetched: int = None  # 0
    shuffle_merged_remote_blocks_fetched: int = None  # 0
    shuffle_merged_remote_bytes_read: int = None  # 0
    shuffle_merged_remote_chunks_fetched: int = None  # 0
    shuffle_merged_remote_reqs_duration: int = None  # 0
    shuffle_mergers_count: int = None  # 0
    shuffle_read_bytes: int = None  # 59
    shuffle_read_records: int = None  # 1
    shuffle_remote_blocks_fetched: int = None  # 0
    shuffle_remote_bytes_read: int = None  # 0
    shuffle_remote_bytes_read_to_disk: int = None  # 0
    shuffle_remote_reqs_duration: int = None  # 0
    shuffle_write_bytes: int = None  # 0
    shuffle_write_records: int = None  # 0
    shuffle_write_time: int = None  # 0
    stage_id: int = None  # 82
    status: StageStatus = None  # "COMPLETE"
    submission_time: str = None  # "2023-10-15T10:17:00.759GMT"
    task_metrics_distributions: TaskMetrics = None

    def __post_init__(self):
        if self.executor_metrics_distributions:
            if 'quantiles' not in self.executor_metrics_distributions:
                self.executor_metrics_distributions = ExecutorMetricsDistributions.load(
                    **self.executor_metrics_distributions,
                )

        if self.peak_executor_metrics:
            self.peak_executor_metrics = Metrics.load(**self.peak_executor_metrics)

        if self.task_metrics_distributions:
            if 'quantiles' in self.task_metrics_distributions:
                self.task_metrics_distributions = TaskMetricsQuantiles.load(
                    **self.task_metrics_distributions,
                )
            else:
                self.task_metrics_distributions = TaskMetrics.load(
                    **self.task_metrics_distributions,
                )

        if self.status:
            try:
                self.status = StageStatus(self.status)
            except ValueError as err:
                print(f'[WARNING] Stage: {err}')
                self.status = self.status

    @property
    def id(self) -> int:
        return self.stage_id


@dataclass
class StageAttempt(StageBase):
    accumulator_updates: List[str] = field(default_factory=list)  # []
    attempt_id: int = None  # 0
    completion_time: str = None  # "2023-10-15T10:17:00.772GMT"
    # org.apache.spark.sql.Dataset.count(Dataset.scala:3625)
    # java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    # java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke
    #   (NativeMethodAccessorImpl.java:62)
    # java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke
    #   (DelegatingMethodAccessorImpl.java:43)
    # java.base/java.lang.reflect.Method.invoke(Method.java:566)
    # py4j.reflection.MethodInvoker.invoke(MethodInvoker.java:244)
    # py4j.reflection.ReflectionEngine.invoke(ReflectionEngine.java:374)
    # py4j.Gateway.invoke(Gateway.java:282)
    # py4j.commands.AbstractCommand.invokeMethod(AbstractCommand.java:132)
    # py4j.commands.CallCommand.execute(CallCommand.java:79)
    # py4j.ClientServerConnection.waitForCommands(ClientServerConnection.java:182)
    # py4j.ClientServerConnection.run(ClientServerConnection.java:106)
    # java.base/java.lang.Thread.run(Thread.java:829)"
    details: str = None
    disk_bytes_spilled: int = None  # 0
    executor_cpu_time: int = None  # 1442666
    executor_deserialize_cpu_time: int = None  # 988667
    executor_deserialize_time: int = None  # 0
    executor_run_time: int = None  # 8
    executor_summary: ExecutorSummary = None  # {}
    first_task_launched_time: str = None  # "2023-10-15T10:17:00.761GMT"
    input_bytes: int = None  # 0
    input_records: int = None  # 0
    is_shuffle_push_enabled: bool = None  # false
    jvm_gc_time: int = None  # 0
    killed_tasks_summary: Dict = field(default_factory=dict)  # {}
    memory_bytes_spilled: int = None  # 0
    name: str = None  # "count at NativeMethodAccessorImpl.java:0"
    num_active_tasks: int = None  # 0
    num_complete_tasks: int = None  # 1
    num_completed_indices: int = None  # 1
    num_failed_tasks: int = None  # 0
    num_killed_tasks: int = None  # 0
    num_tasks: int = None  # 1
    output_bytes: int = None  # 0
    output_records: int = None  # 0
    peak_execution_memory: int = None  # 0
    peak_executor_metrics: Metrics = None  # {}
    rdd_ids: List[int] = None  # [227, 225, 226]
    resource_profile_id: int = None  # 0
    result_serialization_time: int = None  # 0
    result_size: int = None  # 3952
    scheduling_pool: str = None  # "default"
    shuffle_corrupt_merged_block_chunks: int = None  # 0
    shuffle_fetch_wait_time: int = None  # 0
    shuffle_local_blocks_fetched: int = None  # 1
    shuffle_local_bytes_read: int = None  # 59
    shuffle_merged_fetch_fallback_count: int = None  # 0
    shuffle_merged_local_blocks_fetched: int = None  # 0
    shuffle_merged_local_bytes_read: int = None  # 0
    shuffle_merged_local_chunks_fetched: int = None  # 0
    shuffle_merged_remote_blocks_fetched: int = None  # 0
    shuffle_merged_remote_bytes_read: int = None  # 0
    shuffle_merged_remote_chunks_fetched: int = None  # 0
    shuffle_merged_remote_reqs_duration: int = None  # 0
    shuffle_mergers_count: int = None  # 0
    shuffle_read_bytes: int = None  # 59
    shuffle_read_records: int = None  # 1
    shuffle_remote_blocks_fetched: int = None  # 0
    shuffle_remote_bytes_read: int = None  # 0
    shuffle_remote_bytes_read_to_disk: int = None  # 0
    shuffle_remote_reqs_duration: int = None  # 0
    shuffle_write_bytes: int = None  # 0
    shuffle_write_records: int = None  # 0
    shuffle_write_time: int = None  # 0
    stage_id: int = None  # 82
    status: StageStatus = None  # "COMPLETE"
    submission_time: str = None  # "2023-10-15T10:17:00.759GMT"
    tasks: Dict = field(default_factory=dict)  # {}

    def __post_init__(self):
        super().__post_init__()

        if self.executor_summary:
            self.executor_summary = ExecutorSummary.load(**self.executor_summary)

        if self.tasks:
            tasks = {}
            for k, v in self.tasks.items():
                tasks[k] = Task.load(**v)
            self.tasks = tasks

    @property
    def id(self) -> int:
        return self.attempt_id


@dataclass
class Stage(StageBase):
    stage_attempts: List[Dict] = field(default_factory=list)

    def __post_init__(self):
        super().__post_init__()

        if self.stage_attempts:
            self.stage_attempts = [StageAttempt.load(**m) for m in self.stage_attempts]


@dataclass
class InputMetricsSummary(BaseSparkModel):
    # [1871.0, 1871.0, 1871.0, 1871.0, 1871.0]
    bytes_read: List[float] = field(default_factory=list)
    records_read: List[float] = field(default_factory=list)  # [5.0, 5.0, 5.0, 5.0, 5.0]


@dataclass
class OutputMetricsSummary(BaseSparkModel):
    # [1871.0, 1871.0, 1871.0, 1871.0, 1871.0]
    bytes_written: List[float] = field(default_factory=list)
    records_written: List[float] = field(default_factory=list)  # [5.0, 5.0, 5.0, 5.0, 5.0]


@dataclass
class PushReadMetricsDistSummary(BaseSparkModel):
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    corrupt_merged_block_chunks: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    local_merged_blocks_fetched: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    local_merged_bytes_read: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    local_merged_chunks_fetched: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    merged_fetch_fallback_count: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    remote_merged_blocks_fetched: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    remote_merged_bytes_read: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    remote_merged_chunks_fetched: List[float] = field(default_factory=list)
    # [ 0.0, 0.0, 0.0, 0.0, 0.0]
    remote_merged_reqs_duration: List[float] = field(default_factory=list)


@dataclass
class ShuffleReadMetricsSummary(BaseSparkModel):
    fetch_wait_time: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    local_blocks_fetched: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    read_bytes: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    read_records: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    remote_blocks_fetched: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    remote_bytes_read: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    remote_bytes_read_to_disk: List[float] = field(default_factory=list)
    remote_reqs_duration: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    shuffle_push_read_metrics_dist: PushReadMetricsDistSummary = None
    total_blocks_fetched: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]

    def __post_init__(self):
        if self.shuffle_push_read_metrics_dist:
            self.shuffle_push_read_metrics_dist = PushReadMetricsDistSummary(
                **self.shuffle_push_read_metrics_dist,
            )


@dataclass
class ShuffleWriteMetricsSummary(BaseSparkModel):
    write_bytes: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    write_records: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    write_time: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]


@dataclass
class StageAttemptTaskSummary(BaseSparkModel):
    disk_bytes_spilled: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    duration: List[float] = field(default_factory=list)  # [ 13.0, 13.0, 13.0, 13.0, 13.0 ]
    # [ 5458623.0, 5458623.0, 5458623.0, 5458623.0, 5458623.0 ]
    executor_cpu_time: List[float] = field(default_factory=list)
    # [ 1843625.0, 1843625.0, 1843625.0, 1843625.0, 1843625.0 ]
    executor_deserialize_cpu_time: List[float] = field(default_factory=list)
    # [ 1.0, 1.0, 1.0, 1.0, 1.0 ]
    executor_deserialize_time: List[float] = field(default_factory=list)
    executor_run_time: List[float] = field(default_factory=list)  # [ 9.0, 9.0, 9.0, 9.0, 9.0 ]
    getting_result_time: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    input_metrics: InputMetricsSummary = None
    jvm_gc_time: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    memory_bytes_spilled: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    output_metrics: OutputMetricsSummary = None
    peak_execution_memory: List[float] = field(default_factory=list)  # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    quantiles: List[float] = field(default_factory=list)  # [ 0.05, 0.25, 0.5, 0.75, 0.95 ]
    # [ 0.0, 0.0, 0.0, 0.0, 0.0 ]
    result_serialization_time: List[float] = field(default_factory=list)
    # [ 1784.0, 1784.0, 1784.0, 1784.0, 1784.0 ]
    result_size: List[float] = field(default_factory=list)
    scheduler_delay: List[float] = field(default_factory=list)  # [ 3.0, 3.0, 3.0, 3.0, 3.0 ]
    shuffle_read_metrics: ShuffleReadMetricsSummary = None
    shuffle_write_metrics: ShuffleWriteMetricsSummary = None

    def __post_init__(self):
        if self.input_metrics:
            self.input_metrics = InputMetricsSummary.load(**self.input_metrics)
        if self.output_metrics:
            self.output_metrics = OutputMetricsSummary.load(**self.output_metrics)
        if self.shuffle_read_metrics:
            self.shuffle_read_metrics = ShuffleReadMetricsSummary.load(**self.shuffle_read_metrics)
        if self.shuffle_write_metrics:
            self.shuffle_write_metrics = ShuffleWriteMetricsSummary.load(
                **self.shuffle_write_metrics,
            )
