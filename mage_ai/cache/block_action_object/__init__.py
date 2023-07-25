import os
from mage_ai.cache.base import BaseCache
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.cache.constants import CACHE_KEY_BLOCK_ACTION_OBJECTS_MAPPING
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
)
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
from mage_ai.data_preparation.templates.constants import (
    TEMPLATES,
    TEMPLATES_ONLY_FOR_V2,
)
from mage_ai.settings.repo import get_repo_path
from pathlib import Path
from typing import Dict


class BlockActionObjectCache(BaseCache):
    cache_key = CACHE_KEY_BLOCK_ACTION_OBJECTS_MAPPING

    @classmethod
    async def initialize_cache(self, replace: bool = False) -> 'BlockActionObjectCache':
        cache = self()
        if replace or not cache.exists():
            await cache.initialize_cache_for_all_objects()

        return cache

    def build_key_for_block_file(
        self,
        file_path: str = None,
        block_type: BlockType = None,
        language: BlockLanguage = None,
        filename: str = None,
    ) -> str:
        return ':'.join(list(filter(lambda x: x, [
            file_path,
            block_type,
            language,
            filename,
        ])))

    def build_key_for_custom_block_template(
        self,
        custom_block_template: CustomBlockTemplate,
    ) -> str:
        arr = []

        # This is a specific order
        for key in [
            'uuid',
            'block_type',
            'language',
            'name',
            'description',
            'tags',
        ]:
            val = getattr(custom_block_template, key)
            if val:
                if not isinstance(val, list):
                    val = [val]
                arr += val

        return ':'.join(arr)

    def build_key_for_mage_template(self, block_action_object: Dict) -> str:
        arr = []

        # This is a specific order
        for key in [
            'path',
            'block_type',
            'language',
            'name',
            'description',
            'groups',
        ]:
            val = block_action_object.get(key)
            if val:
                if not isinstance(val, list):
                    val = [val]
                arr += val

        return ':'.join(arr)

    async def initialize_cache_for_all_objects(self) -> None:
        mapping = {
            OBJECT_TYPE_BLOCK_FILE: {},
            OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE: {},
            OBJECT_TYPE_MAGE_TEMPLATE: {},
        }

        for block_action_object in (TEMPLATES + TEMPLATES_ONLY_FOR_V2):
            key = self.build_key_for_mage_template(block_action_object)
            mapping[OBJECT_TYPE_MAGE_TEMPLATE][key] = block_action_object

        file_dicts = get_templates(DIRECTORY_FOR_BLOCK_TEMPLATES)
        file_dicts_flat = flatten_files(file_dicts)
        custom_block_templates = group_and_hydrate_files(file_dicts_flat, CustomBlockTemplate)

        for custom_block_template in custom_block_templates:
            key = self.build_key_for_custom_block_template(custom_block_template)
            mapping[OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE][key] = custom_block_template.to_dict(
                include_content=True,
            )

        block_files = []

        for block_type in BlockType:
            file_directory_name = Block.file_directory_name(block_type)
            directory_full_path = os.path.join(get_repo_path(), file_directory_name)

            for path in Path(directory_full_path).rglob('*'):
                if not path.is_file():
                    continue

                block_file_absolute_path = path.absolute()
                file_path = str(block_file_absolute_path).replace(get_repo_path(), '')
                if file_path.startswith(os.sep):
                    file_path = file_path[1:]

                file_path_parts = os.path.split(file_path)
                filename = file_path_parts[-1]

                if '__init__.py' == filename:
                    continue

                filename_parts = filename.split('.')
                file_extension = None
                if len(filename_parts) >= 2:
                    file_extension = filename_parts[-1]

                block_language = None
                if file_extension:
                    block_language = FILE_EXTENSION_TO_BLOCK_LANGUAGE.get(file_extension)

                if not block_language:
                    continue

                key = self.build_key_for_block_file(
                    file_path,
                    block_type,
                    block_language,
                    filename,
                )

                content = None
                with open(block_file_absolute_path, 'r') as f:
                    content = f.read()

                mapping[OBJECT_TYPE_BLOCK_FILE][key] = dict(
                    content=content,
                    file_path=file_path,
                    language=block_language,
                    type=block_type,
                    uuid='.'.join(filename_parts[:-1]),
                )

        self.set(self.cache_key, mapping)
