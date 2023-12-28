from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.shared.hash import merge_dict


class CustomDesignPresenter(BasePresenter):
    default_attributes = [
        'components',
        'pages',
        'project',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return merge_dict(self.resource.model.to_dict(), dict(
            uuid=self.resource.model.uuid,
        ))
