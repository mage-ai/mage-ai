import os
import shutil
import yaml
from dataclasses import dataclass, field
from jinja2 import Template
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    BlockColor,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.custom_templates.constants import (
    DIRECTORY_FOR_BLOCK_TEMPLATES,
    METADATA_FILENAME_WITH_EXTENSION,
)
from mage_ai.data_preparation.models.custom_templates.utils import custom_templates_directory
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.io import safe_write
from typing import Dict, List


@dataclass
class CustomBlockTemplate(BaseConfig):
    block_type: BlockType = None
    color: BlockColor = None
    configuration: Dict = None
    content: str = ''
    description: str = None
    language: BlockLanguage = None
    name: str = None
    pipeline: Dict = field(default_factory=dict)
    tags: List = field(default_factory=list)
    template_uuid: str = None
    user: Dict = field(default_factory=dict)

    @classmethod
    def load(self, template_uuid: str = None, uuid: str = None):
        uuid_use = uuid
        template_uuid_use = template_uuid

        if uuid_use:
            parts = uuid_use.split(os.sep)
            template_uuid_use = os.path.join(*parts[2:])
        elif template_uuid_use:
            uuid_use = os.path.join(
                custom_templates_directory(),
                DIRECTORY_FOR_BLOCK_TEMPLATES,
                template_uuid_use,
            )

        try:
            config_path_metadata = os.path.join(
                get_repo_path(),
                uuid_use,
                METADATA_FILENAME_WITH_EXTENSION,
            )
            custom_template = super().load(config_path_metadata)
            custom_template.template_uuid = template_uuid_use

            return custom_template
        except Exception as err:
            print(f'[WARNING] CustomBlockTemplate.load: {err}')

    @property
    def uuid(self):
        return os.path.join(
            custom_templates_directory(),
            DIRECTORY_FOR_BLOCK_TEMPLATES,
            self.template_uuid,
        )

    @property
    def metadata_file_path(self) -> str:
        return os.path.join(
            get_repo_path(),
            self.uuid,
            METADATA_FILENAME_WITH_EXTENSION,
        )

    def create_block(
        self,
        block_name: str,
        pipeline: Pipeline,
        extension_uuid: str = None,
        priority: int = None,
        upstream_block_uuids: List[str] = None,
        **kwargs,
    ) -> Block:
        configuration = None
        if self.configuration and type(self.configuration) is dict:
            configuration = self.configuration

        return Block.create(
            block_name,
            self.block_type,
            get_repo_path(),
            color=self.color,
            configuration=configuration,
            extension_uuid=extension_uuid,
            language=self.language,
            pipeline=pipeline,
            priority=priority,
            upstream_block_uuids=upstream_block_uuids,
        )

    def load_template_content(self, language: BlockLanguage = None) -> str:
        language_to_use = language or self.language
        filename = '.'.join([
            self.template_uuid,
            BLOCK_LANGUAGE_TO_FILE_EXTENSION.get(language_to_use, ''),
        ])

        return File(
            dir_path=self.uuid,
            filename=filename,
            repo_path=get_repo_path(),
        ).content()

    def render_template(
        self,
        language: BlockLanguage = None,
        variables: Dict = None,
    ) -> str:
        content = self.load_template_content(language)
        if content:
            return Template(content).render(**(variables or {}))

    def to_dict(self, include_content: bool = False) -> Dict:
        data = merge_dict(self.to_dict_base(), dict(
            template_uuid=self.template_uuid,
            uuid=self.uuid,
        ))

        if include_content:
            data['content'] = self.load_template_content()

        return data

    def to_dict_base(self) -> Dict:
        return dict(
            block_type=self.block_type,
            color=self.color,
            configuration=self.configuration,
            description=self.description,
            language=self.language,
            name=self.name,
            pipeline=self.pipeline,
            tags=self.tags,
            user=self.user,
        )

    def save(self) -> None:
        content = yaml.safe_dump(self.to_dict_base())
        file_path = self.metadata_file_path
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        safe_write(file_path, content)

        if self.content:
            filename = '.'.join([
                self.template_uuid,
                BLOCK_LANGUAGE_TO_FILE_EXTENSION[self.language],
            ])

            File.create(
                filename,
                self.uuid,
                self.content,
                get_repo_path(),
            )

    def delete(self) -> None:
        shutil.rmtree(os.path.join(get_repo_path(), self.uuid))
