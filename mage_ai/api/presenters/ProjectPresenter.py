from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.shared.hash import extract


class ProjectPresenter(BasePresenter):
    default_attributes = [
        'help_improve_mage',
        'latest_version',
        'name',
        'openai_api_key',
        'project_uuid',
        'version',
    ]
