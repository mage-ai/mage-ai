import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.data_preparation.models.custom_templates.constants import (
    DIRECTORY_FOR_BLOCK_TEMPLATES,
    DIRECTORY_FOR_PIPELINE_TEMPLATES,
)
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.custom_templates.custom_pipeline_template import (
    CustomPipelineTemplate,
)
from mage_ai.data_preparation.models.custom_templates.utils import (
    flatten_files,
    get_templates,
    group_and_hydrate_files,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.templates.template import fetch_template_source
from mage_ai.shared.hash import ignore_keys
from mage_ai.shared.utils import clean_name
from mage_ai.usage_statistics.logger import UsageStatisticLogger

OBJECT_TYPE_KEY = 'object_type'


class CustomTemplateResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        object_type = query.get(OBJECT_TYPE_KEY, [None])
        if object_type:
            object_type = object_type[0]

        templates = []
        file_dicts = []

        if DIRECTORY_FOR_BLOCK_TEMPLATES == object_type:
            file_dicts = get_templates(DIRECTORY_FOR_BLOCK_TEMPLATES)
            template_class = CustomBlockTemplate
        elif DIRECTORY_FOR_PIPELINE_TEMPLATES == object_type:
            file_dicts = get_templates(DIRECTORY_FOR_PIPELINE_TEMPLATES)
            template_class = CustomPipelineTemplate

        if file_dicts:
            file_dicts_flat = flatten_files(file_dicts)
            templates = group_and_hydrate_files(file_dicts_flat, template_class)

        return self.build_result_set(
            templates,
            user,
            **kwargs,
        )

    @classmethod
    async def create(self, payload, user, **kwargs):
        custom_template = None
        object_type = payload.get(OBJECT_TYPE_KEY)
        template_uuid = payload.get('template_uuid')

        if template_uuid:
            template_uuid = clean_name(template_uuid)
            payload['template_uuid'] = template_uuid

        if DIRECTORY_FOR_BLOCK_TEMPLATES == object_type:
            custom_template = CustomBlockTemplate.load(template_uuid=template_uuid)

            if not custom_template:
                custom_template = CustomBlockTemplate(**ignore_keys(payload, [
                    'uuid',
                    OBJECT_TYPE_KEY,
                ]))
                if user:
                    custom_template.user = dict(
                        username=user.username,
                    )

                custom_template.content = fetch_template_source(
                    custom_template.block_type,
                    payload.get('config', {}),
                    language=custom_template.language,
                )

                custom_template.save()

                cache = await BlockActionObjectCache.initialize_cache()
                cache.update_custom_block_template(custom_template)
        elif DIRECTORY_FOR_PIPELINE_TEMPLATES == object_type:
            custom_template = CustomPipelineTemplate.load(template_uuid=template_uuid)

            if not custom_template:
                pipeline = Pipeline.get(payload.get('pipeline_uuid'))
                custom_template = CustomPipelineTemplate.create_from_pipeline(
                    pipeline,
                    template_uuid,
                    name=payload.get('name'),
                    description=payload.get('description'),
                )

                if user:
                    custom_template.user = dict(
                        username=user.username,
                    )

                custom_template.save()

        if custom_template:
            await UsageStatisticLogger().custom_template_create(custom_template)

            return self(custom_template, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        query = kwargs.get('query', {})
        object_type = query.get(OBJECT_TYPE_KEY, [None])
        if object_type:
            object_type = object_type[0]

        template_uuid = urllib.parse.unquote(pk)

        try:
            if DIRECTORY_FOR_BLOCK_TEMPLATES == object_type:
                return self(CustomBlockTemplate.load(template_uuid=template_uuid), user, **kwargs)
            elif DIRECTORY_FOR_PIPELINE_TEMPLATES == object_type:
                return self(
                    CustomPipelineTemplate.load(template_uuid=template_uuid),
                    user,
                    **kwargs,
                )
        except Exception as err:
            print(f'[WARNING] CustomTemplateResource.member: {err}')
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

    async def delete(self, **kwargs):
        cache = await BlockActionObjectCache.initialize_cache()
        cache.update_custom_block_template(self.model, remove=True)
        self.model.delete

    async def update(self, payload, **kwargs):
        template_uuid = payload.get('template_uuid')

        if template_uuid:
            template_uuid = clean_name(template_uuid)
            payload['template_uuid'] = template_uuid

        object_type = payload.get('object_type')

        cache = None
        if DIRECTORY_FOR_BLOCK_TEMPLATES == object_type:
            cache = await BlockActionObjectCache.initialize_cache()
            cache.update_custom_block_template(self.model, remove=True)

        for key, value in ignore_keys(payload, [
            'uuid',
            OBJECT_TYPE_KEY,
        ]).items():
            setattr(self.model, key, value)
        self.model.save()

        if DIRECTORY_FOR_BLOCK_TEMPLATES == object_type and cache:
            cache.update_custom_block_template(self.model)
