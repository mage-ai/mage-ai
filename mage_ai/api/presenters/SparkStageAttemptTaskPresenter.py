from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkStageAttemptTaskPresenter(BasePresenter):
    default_attributes = [
        'accumulator_updates',
        'attempt',
        'duration',
        'executor_id',
        'executor_logs',
        'getting_result_time',
        'host',
        'index',
        'launch_time',
        'partition_id',
        'scheduler_delay',
        'speculative',
        'status',
        'task_id',
        'task_locality',
        'task_metrics',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
