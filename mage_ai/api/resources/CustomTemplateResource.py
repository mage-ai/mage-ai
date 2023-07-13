import os
from mage_ai.api.errors import ApiError
from mage_ai.data_preparation.models.custom_templates.constants import (
    DIRECTORY_FOR_BLOCK_TEMPLATES,
)
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.custom_templates.utils import (
    flatten_files,
    get_templates,
    group_and_hydrate_files,
)
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.shared.hash import ignore_keys

OBJECT_TYPE_BLOCK = 'block'
OBJECT_TYPE_KEY = 'object_type'


class CustomTemplateResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        object_type = query.get(OBJECT_TYPE_KEY, [None])
        if object_type:
            object_type = object_type[0]

        templates = []

        if OBJECT_TYPE_BLOCK == object_type:
            file_dicts = get_templates(DIRECTORY_FOR_BLOCK_TEMPLATES)
            file_dicts_flat = flatten_files(file_dicts)
            templates = group_and_hydrate_files(file_dicts_flat, CustomBlockTemplate)

        return self.build_result_set(
            templates,
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        custom_template = None
        if OBJECT_TYPE_BLOCK == payload.get(OBJECT_TYPE_KEY):
            custom_template = CustomBlockTemplate(**ignore_keys(payload, [OBJECT_TYPE_KEY]))
            custom_template.save()

        if custom_template:
            return self(custom_template, user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self({}, user, **kwargs)

    def delete(self, **kwargs):
        pass

    def update(self, payload, **kwargs):
        pass
