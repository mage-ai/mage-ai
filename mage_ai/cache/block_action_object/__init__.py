import os
from pathlib import Path
from typing import Dict

from mage_ai.cache.base import BaseCache
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.cache.constants import CACHE_KEY_BLOCK_ACTION_OBJECTS_MAPPING
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
    BlockType,
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
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.templates.constants import (
    TEMPLATES,
    TEMPLATES_ONLY_FOR_V2,
)
from mage_ai.data_preparation.templates.data_integrations.utils import (
    get_templates as get_templates_for_data_integrations,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.strings import remove_extension_from_filename


def parse_block_file_absolute_path(block_file_absolute_path: str) -> Dict:
    block_type = Block.block_type_from_path(block_file_absolute_path)
    file_directory_name = Block.file_directory_name(block_type)

    # This is the block_file_absolute_path without the repo_path
    file_path = str(block_file_absolute_path).replace(get_repo_path(), '')
    if file_path.startswith(os.sep):
        file_path = file_path[1:]

    file_path_parts = file_path.split(os.path.sep)

    if len(file_path_parts) >= 1 and file_directory_name == file_path_parts[0]:
        file_path_parts = file_path_parts[1:]

    # This is the file_path without the block type directory
    filename = os.path.join(*file_path_parts)

    filename_parts = filename.split('.')
    file_extension = None
    if len(filename_parts) >= 2:
        file_extension = filename_parts[-1]

    block_language = None
    if file_extension:
        block_language = FILE_EXTENSION_TO_BLOCK_LANGUAGE.get(file_extension)

    return dict(
        block_type=block_type,
        file_path=file_path,
        filename=filename,
        filename_parts=filename_parts,
        language=block_language,
    )


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
            remove_extension_from_filename(filename).replace('_', ' ') if filename else filename,
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

    def update_block(
        self,
        block: Block = None,
        block_file_absolute_path: str = None,
        remove: bool = False,
    ) -> None:
        if block:
            block_type = block.type
            file_path = os.path.join(block.file.dir_path, block.file.filename)
            filename = os.path.join(*file_path.split(os.path.sep)[1:])
            language = block.language
            uuid = block.uuid
        else:
            d = parse_block_file_absolute_path(block_file_absolute_path)
            block_type = d.get('block_type')
            file_path = d.get('file_path')
            filename = d.get('filename')
            language = d.get('language')

            filename_parts = d.get('filename_parts')
            uuid = '.'.join(filename_parts[:-1])

        key = self.build_key_for_block_file(
            file_path,
            block_type,
            language,
            filename,
        )

        mapping = self.load_all_data()
        if mapping is None:
            mapping = {}

        if OBJECT_TYPE_BLOCK_FILE not in mapping:
            mapping[OBJECT_TYPE_BLOCK_FILE] = {}

        if remove:
            if key in mapping[OBJECT_TYPE_BLOCK_FILE]:
                mapping[OBJECT_TYPE_BLOCK_FILE].pop(key, None)
        else:
            content = None
            if block:
                content = block.content
            else:
                with open(block_file_absolute_path, 'r') as f:
                    content = f.read()

            mapping[OBJECT_TYPE_BLOCK_FILE][key] = dict(
                content=content,
                file_path=file_path,
                language=language,
                type=block_type,
                uuid=uuid,
            )

        self.set(self.cache_key, mapping)

    def update_custom_block_template(
        self,
        custom_block_template: CustomBlockTemplate,
        remove: bool = False,
    ) -> None:
        key = self.build_key_for_custom_block_template(custom_block_template)

        mapping = self.load_all_data()
        if mapping is None:
            mapping = {}

        if OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE not in mapping:
            mapping[OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE] = {}

        if remove:
            if key in mapping[OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE]:
                mapping[OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE].pop(key, None)
        else:
            mapping[OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE][key] = custom_block_template.to_dict(
                include_content=True,
            )

        self.set(self.cache_key, mapping)

    async def initialize_cache_for_all_objects(self) -> None:
        mapping = {
            OBJECT_TYPE_BLOCK_FILE: {},
            OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE: {},
            OBJECT_TYPE_MAGE_TEMPLATE: {},
        }

        mage_templates = TEMPLATES + TEMPLATES_ONLY_FOR_V2
        if Project().is_feature_enabled(FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE):
            mage_templates += get_templates_for_data_integrations()

        for block_action_object in mage_templates:
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

        for block_type in BlockType:
            file_directory_name = Block.file_directory_name(block_type)
            directory_full_path = os.path.join(get_repo_path(), file_directory_name)

            for path in Path(directory_full_path).rglob('*'):
                if not path.is_file():
                    continue

                block_file_absolute_path = path.absolute()
                d = parse_block_file_absolute_path(block_file_absolute_path)

                file_path = d.get('file_path')
                filename = d.get('filename')
                filename_parts = d.get('filename_parts')
                language = d.get('language')

                if '__init__.py' == filename:
                    continue

                if not language:
                    continue

                key = self.build_key_for_block_file(
                    file_path,
                    block_type,
                    language,
                    filename,
                )

                content = None
                with open(block_file_absolute_path, 'r') as f:
                    content = f.read()

                mapping[OBJECT_TYPE_BLOCK_FILE][key] = dict(
                    content=content,
                    file_path=file_path,
                    language=language,
                    type=block_type,
                    uuid='.'.join(filename_parts[:-1]),
                )

        self.set(self.cache_key, mapping)
