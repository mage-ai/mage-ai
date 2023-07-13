import os
import yaml
from dataclasses import dataclass, field
from jinja2 import Template
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.constants import (
    BLOCK_LANGUAGE_TO_FILE_EXTENSION,
    BlockColor,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.custom_templates.constants import (
    DIRECTORY_FOR_BLOCK_TEMPLATES,
    METADATA_FILENAME_WITH_EXTENSION,
)
from mage_ai.data_preparation.models.custom_templates.utils import custom_templates_directory
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.io import safe_write
from typing import Dict, List


@dataclass
class CustomBlockTemplate(BaseConfig):
    block_type: BlockType = None
    color: BlockColor = None
    configuration: Dict = None
    description: str = None
    file_path: str = None
    filenames_in_directory: List[str] = field(default_factory=list)
    language: BlockLanguage = None
    name: str = None
    pipeline: Dict = field(default_factory=dict)
    tags: Dict = field(default_factory=dict)
    user: Dict = field(default_factory=dict)
    uuid: str = None

    @classmethod
    def load(self, config_path: str = None, config: Dict = None):
        config_path_metadata = os.path.join(config_path, METADATA_FILENAME_WITH_EXTENSION)
        return super().load(config_path_metadata)

    def metadata_file_path(self) -> str:
        return os.path.join(
            custom_templates_directory(),
            DIRECTORY_FOR_BLOCK_TEMPLATES,
            self.file_path,
            METADATA_FILENAME_WITH_EXTENSION,
        )

    def load_template_content(self, language: BlockLanguage = None) -> str:
        language_to_use = language or self.language
        filename = '.'.join([
            self.uuid,
            BLOCK_LANGUAGE_TO_FILE_EXTENSION[language_to_use],
        ])

        return File(
            dir_path=os.path.join(
                custom_templates_directory(without_repo_path=True),
                DIRECTORY_FOR_BLOCK_TEMPLATES,
                self.file_path,
            ),
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

    def to_dict(self) -> Dict:
        return dict(
            block_type=self.block_type,
            color=self.color,
            configuration=self.configuration,
            description=self.description,
            filenames_in_directory=self.filenames_in_directory,
            language=self.language,
            name=self.name,
            pipeline=self.pipeline,
            tags=self.tags,
            user=self.user,
            uuid=self.uuid,
        )

    def save(self) -> None:
        content = yaml.safe_dump(self.to_dict())
        safe_write(self.metadata_file_path(), content)
