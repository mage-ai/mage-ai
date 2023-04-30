from mage_ai.api.presenters.BasePresenter import BasePresenter


class ProjectPresenter(BasePresenter):
    default_attributes = [
        'help_improve_mage',
        'latest_version',
        'name',
        'project_uuid',
        'version',
    ]
