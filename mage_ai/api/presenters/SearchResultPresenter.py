from mage_ai.api.operations import constants
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.services.search.constants import SEARCH_TYPE_BLOCK_ACTION_OBJECTS
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.strings import remove_extension_from_filename


class SearchResultPresenter(BasePresenter):
    default_attributes = [
        'results',
        'type',
        'uuid',
    ]

    def present(self, **kwargs):
        display_format = kwargs['format']

        if constants.CREATE != display_format:
            return self.model

        results = self.model.get('results', [])
        search_type = self.model.get('type')
        results_transformed = []

        if SEARCH_TYPE_BLOCK_ACTION_OBJECTS == search_type:
            for result in results:
                block_action_object = result.get('block_action_object')
                object_type = result.get('object_type')
                uuid = result.get('uuid')

                block_type = None
                description = block_action_object.get('description')
                language = block_action_object.get('language')
                title = None

                if OBJECT_TYPE_BLOCK_FILE == object_type:
                    block_type = block_action_object.get('type')
                    u = block_action_object.get('uuid')
                    title = ' '.join(list(filter(lambda x: x, [
                        remove_extension_from_filename(u).replace('_', ' ') if u else u,
                    ])))
                elif OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE == object_type:
                    block_type = block_action_object.get('block_type')
                    template_name = block_action_object.get('name')
                    template_uuid = block_action_object.get('template_uuid')
                    u = template_name or template_uuid
                    title = ' '.join(list(filter(lambda x: x, [
                        remove_extension_from_filename(u).replace('_', ' ') if u else u,
                    ])))
                elif OBJECT_TYPE_MAGE_TEMPLATE == object_type:
                    block_type = block_action_object.get('block_type')
                    u = block_action_object.get('name')
                    title = ' '.join(list(filter(lambda x: x, [
                        remove_extension_from_filename(u).replace('_', ' ') if u else u,
                    ])))

                results_transformed.append(dict(
                    block_type=block_type,
                    description=description,
                    language=language,
                    object_type=object_type,
                    title=title,
                    uuid=uuid,
                ))

        return merge_dict(self.model, dict(
            results=results_transformed,
        ))
