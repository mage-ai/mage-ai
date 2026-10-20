from mage_ai.api.operations.constants import OperationType
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.api.presenters.SparkStageAttemptPresenter import SparkStageAttemptPresenter


class SparkStagePresenter(BasePresenter):
    default_attributes = [
        'accumulator_updates',
        'application',
        'attempt_id',
        'completion_time',
        'details',
        'disk_bytes_spilled',
        'executor_cpu_time',
        'executor_deserialize_cpu_time',
        'executor_deserialize_time',
        'executor_run_time',
        'first_task_launched_time',
        'input_bytes',
        'input_records',
        'is_shuffle_push_enabled',
        'jvm_gc_time',
        'killed_tasks_summary',
        'memory_bytes_spilled',
        'name',
        'num_active_tasks',
        'num_complete_tasks',
        'num_completed_indices',
        'num_failed_tasks',
        'num_killed_tasks',
        'num_tasks',
        'output_bytes',
        'output_records',
        'peak_execution_memory',
        'peak_executor_metrics',
        'rdd_ids',
        'resource_profile_id',
        'result_serialization_time',
        'result_size',
        'scheduling_pool',
        'shuffle_corrupt_merged_block_chunks',
        'shuffle_fetch_wait_time',
        'shuffle_local_blocks_fetched',
        'shuffle_local_bytes_read',
        'shuffle_merged_fetch_fallback_count',
        'shuffle_merged_local_blocks_fetched',
        'shuffle_merged_local_bytes_read',
        'shuffle_merged_local_chunks_fetched',
        'shuffle_merged_remote_blocks_fetched',
        'shuffle_merged_remote_bytes_read',
        'shuffle_merged_remote_chunks_fetched',
        'shuffle_merged_remote_reqs_duration',
        'shuffle_mergers_count',
        'shuffle_read_bytes',
        'shuffle_read_records',
        'shuffle_remote_blocks_fetched',
        'shuffle_remote_bytes_read',
        'shuffle_remote_bytes_read_to_disk',
        'shuffle_remote_reqs_duration',
        'shuffle_write_bytes',
        'shuffle_write_records',
        'shuffle_write_time',
        'stage_id',
        'status',
        'submission_time',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()


SparkStagePresenter.register_format(OperationType.DETAIL, [
    'stage_attempts',
    'stage_id',
])


SparkStagePresenter.register_format(
    'with_details',
    list(set(
        SparkStagePresenter.default_attributes + SparkStageAttemptPresenter.default_attributes,
    )),
)
