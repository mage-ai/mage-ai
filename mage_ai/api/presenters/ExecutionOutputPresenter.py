from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class ExecutionOutputPresenter(BasePresenter):
    default_attributes = [
        'absolute_path',
        'environment',
        'messages',
        'namespace',
        'output',
        'path',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        display_format = kwargs.get('format')

        if display_format == 'with_output_statistics':
            await self.resource.model.load_output(statistics_only=True)

        return self.resource.model.to_dict(ignore_empty=True)


ExecutionOutputPresenter.register_format(
    'with_output_statistics',
    ExecutionOutputPresenter.default_attributes,
)
