from typing import Dict

from mage_ai.api.presenters.BasePresenter import BasePresenter


class GlobalHookPresenter(BasePresenter):
    default_attributes = [
        'conditions',
        'operation_type',
        'outputs',
        'pipeline',
        'predicates',
        'resource_type',
        'run_settings',
        'stages',
        'strategies',
        'uuid',
    ]

    async def prepare_present(self, **kwargs) -> Dict:
        data = self.resource.model.to_dict(include_all=True)

        display_format = kwargs.get('format')
        if 'with_pipeline_details' == display_format:
            data['pipeline_details'] = await self.pipeline_details(**kwargs)

        return data

    async def pipeline_details(self, **kwargs) -> Dict:
        if self.resource.model.pipeline_settings and \
                self.resource.model.pipeline_settings.get('uuid'):

            pipeline = await self.resource.pipeline
            pipeline_dict = await pipeline.to_dict_async()
            return pipeline_dict


GlobalHookPresenter.register_format(
    'with_pipeline_details',
    GlobalHookPresenter.default_attributes + [
        'pipeline_details',
    ],
)
