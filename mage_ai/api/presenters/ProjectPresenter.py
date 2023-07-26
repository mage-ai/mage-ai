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

    def present(self, **kwargs):
        data = extract(self.model, ProjectPresenter.default_attributes)

        openai_api_key = data.get('openai_api_key')

        data['openai_api_key'] = True if openai_api_key and len(openai_api_key) >= 1 else False

        return data
