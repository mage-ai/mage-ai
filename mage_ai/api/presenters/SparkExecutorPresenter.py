from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkExecutorPresenter(BasePresenter):
    default_attributes = [
        'active_tasks',
        'add_time',
        'attributes',
        'blacklisted_in_stages',
        'completed_tasks',
        'disk_used',
        'excluded_in_stages',
        'executor_logs',
        'failed_tasks',
        'host_port',
        'id',
        'is_active',
        'is_blacklisted',
        'is_excluded',
        'max_memory',
        'max_tasks',
        'memory_metrics',
        'memory_used',
        'peak_memory_metrics',
        'rdd_blocks',
        'resource_profile_id',
        'resources',
        'total_cores',
        'total_duration',
        'total_gc_time',
        'total_input_bytes',
        'total_shuffle_read',
        'total_shuffle_write',
        'total_tasks',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
