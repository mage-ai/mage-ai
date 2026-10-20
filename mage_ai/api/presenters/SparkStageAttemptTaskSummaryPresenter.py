from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkStageAttemptTaskSummaryPresenter(BasePresenter):
    default_attributes = [
        'disk_bytes_spilled',
        'duration',
        'executor_cpu_time',
        'executor_deserialize_cpu_time',
        'executor_deserialize_time',
        'executor_run_time',
        'getting_result_time',
        'input_metrics',
        'jvm_gc_time',
        'memory_bytes_spilled',
        'output_metrics',
        'peak_execution_memory',
        'quantiles',
        'result_serialization_time',
        'result_size',
        'scheduler_delay',
        'shuffle_read_metrics',
        'shuffle_write_metrics',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
