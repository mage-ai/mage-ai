from mage_ai.api.presenters.BasePresenter import BasePresenter


class ProjectPresenter(BasePresenter):
    default_attributes = [
        'features',
        'help_improve_mage',
        'latest_version',
        'name',
        'openai_api_key',
        'project_uuid',
        'version',
    ]
