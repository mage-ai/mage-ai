from mage_ai.api.presenters.BasePresenter import BasePresenter


class LogPresenter(BasePresenter):
    default_attributes = [
        'block_run_logs',
        'pipeline_run_logs',
    ]
