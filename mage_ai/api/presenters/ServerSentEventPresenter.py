from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class ServerSentEventPresenter(BasePresenter):
    default_attributes = [
        'exitcode',
        'is_alive',
        'message',
        'pid',
        'timestamp',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
