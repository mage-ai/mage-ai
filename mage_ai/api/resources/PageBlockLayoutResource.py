import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.presenters.block_layout.page import PageBlockLayout
from mage_ai.shared.hash import ignore_keys, merge_dict
from mage_ai.shared.utils import clean_name


class PageBlockLayoutResource(GenericResource):
    @classmethod
    def get_model(self, pk):
        uuid = urllib.parse.unquote(pk)
        return PageBlockLayout.load(uuid)

    @classmethod
    def member(self, pk, user, **kwargs):
        model = self.get_model(pk)

        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return self(model, user, **kwargs)

    def update(self, payload, **kwargs):
        blocks = payload.get('blocks') or {}
        layout = payload.get('layout') or []

        blocks_with_new_names = {}
        for block_uuid, block_config in blocks.items():
            block_name = block_config.get('name')
            block_name_new = block_config.get('name_new')

            if block_name_new and block_name_new != block_name:
                blocks_with_new_names[block_uuid] = merge_dict(ignore_keys(block_config, [
                    'name_new',
                ]), dict(
                    name=block_name_new,
                    uuid=clean_name(block_name_new),
                ))

        for block_uuid, block_config in blocks_with_new_names.items():
            blocks.pop(block_uuid, None)
            block_uuid_new = block_config.get('uuid')
            blocks[block_uuid_new] = block_config

        for idx1, row in enumerate(layout):
            for idx2, column in enumerate(row):
                block_uuid = column.get('block_uuid')
                block = blocks_with_new_names.get(block_uuid)
                if block:
                    layout[idx1][idx2]['block_uuid'] = block.get('uuid')

        self.model.blocks = blocks
        self.model.layout = layout
        self.model.save()
