from mage_ai.api.presenters.BasePresenter import BasePresenter


class ProjectPresenter(BasePresenter):
    default_attributes = [
        'emr_config',
        'features',
        'help_improve_mage',
        'latest_version',
        'name',
        'openai_api_key',
        'pipelines',
        'project_uuid',
        'remote_variables_dir',
        'spark_config',
        'version',
    ]
