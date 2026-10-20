from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class CodeExecutionPresenter(BasePresenter):
    default_attributes = [
        'exitcode',
        'is_alive',
        'message',
        'message_uuid',
        'pid',
        'timestamp',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        return self.resource.model.to_dict()
