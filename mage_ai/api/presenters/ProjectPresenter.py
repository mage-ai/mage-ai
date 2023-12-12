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
        'projects',
        'remote_variables_dir',
        'repo_path',
        'root_project',
        'settings',
        'spark_config',
        'version',
    ]
