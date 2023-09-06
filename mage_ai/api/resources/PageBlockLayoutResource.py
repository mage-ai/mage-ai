import os
import urllib.parse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.presenters.block_layout.page import PageBlockLayout
from mage_ai.shared.hash import extract, ignore_keys, merge_dict
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

        blocks_with_content = {}
        blocks_with_new_names = {}

        for block_uuid, block_config in blocks.items():
            block_name = block_config.get('name')
            block_name_new = block_config.get('name_new')
            block_type = block_config.get('type')

            if block_name_new and block_name_new != block_name:
                blocks_with_new_names[block_uuid] = merge_dict(ignore_keys(block_config, [
                    'name_new',
                ]), dict(
                    name=block_name_new,
                    uuid=clean_name(block_name_new),
                ))

            if 'content' in block_config:
                file_path = block_config.get('file_path')
                block_uuid_use = block_uuid
                if file_path:
                    parts = file_path.split(os.path.sep)
                    if len(parts) >= 2:
                        block_uuid_use = os.path.join(*parts[1:])

                block = Block.get_block(
                    block_uuid_use,
                    block_uuid_use,
                    block_type,
                    **extract(block_config, [
                        'language',
                    ]),
                )
                blocks_with_content[block_uuid] = block

        for block_uuid, block_config in blocks_with_new_names.items():
            blocks.pop(block_uuid, None)
            block_name_new = block_config.get('name')
            block_uuid_new = block_config.get('uuid')
            blocks[block_uuid_new] = block_config

            if block_uuid in blocks_with_content:
                block = blocks_with_content[block_uuid]
                block.update(dict(name=block_name_new))

        for block_uuid, block in blocks_with_content.items():
            block.update_content(
                blocks.get(block_uuid, {}).get('content'),
                error_if_file_missing=False,
            )
            blocks[block_uuid].pop('content', None)

        for idx1, row in enumerate(layout):
            for idx2, column in enumerate(row):
                block_uuid = column.get('block_uuid')
                block = blocks_with_new_names.get(block_uuid)
                if block:
                    layout[idx1][idx2]['block_uuid'] = block.get('uuid')

        self.model.blocks = blocks
        self.model.layout = layout
        self.model.save()
