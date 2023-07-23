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
    DIRECTORY_FOR_PIPELINE_TEMPLATES,
    METADATA_FILENAME_WITH_EXTENSION,
)
from mage_ai.data_preparation.models.custom_templates.utils import custom_templates_directory
from mage_ai.data_preparation.models.triggers import TRIGGER_FILE_NAME, load_triggers_file_data
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.io import safe_write
from typing import Dict, List


@dataclass
class CustomPipelineTemplate(BaseConfig):
    description: str = None
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
                DIRECTORY_FOR_PIPELINE_TEMPLATES,
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
            print(f'[WARNING] CustomPipelineTemplate.load: {err}')

    @classmethod
    def create_from_pipeline(
        self,
        pipeline: Pipeline,
        template_uuid: str,
        name: str = None,
        description: str = None,
    ):
        pipeline_dict = pipeline.to_dict(
            exclude_data_integration=True,
            include_extensions=True,
        )

        custom_template = self(
            description=description,
            name=name,
            pipeline=pipeline_dict,
            template_uuid=template_uuid,
        )

        custom_template.save()

        triggers = load_triggers_file_data(pipeline.uuid)
        if triggers:
            custom_template.save_triggers(triggers)

        return custom_template

    @property
    def uuid(self):
        return os.path.join(
            custom_templates_directory(),
            DIRECTORY_FOR_PIPELINE_TEMPLATES,
            self.template_uuid,
        )

    @property
    def metadata_file_path(self) -> str:
        return os.path.join(
            get_repo_path(),
            self.uuid,
            METADATA_FILENAME_WITH_EXTENSION,
        )

    def to_dict(self) -> Dict:
        return merge_dict(self.to_dict_base(), dict(
            template_uuid=self.template_uuid,
            uuid=self.uuid,
        ))

    def to_dict_base(self) -> Dict:
        return dict(
            description=self.description,
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

    def save_triggers(self, triggers: Dict) -> None:
        content = yaml.safe_dump(triggers)
        file_path = os.path.join(
            get_repo_path(),
            self.uuid,
            TRIGGER_FILE_NAME,
        )
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        safe_write(file_path, content)

    def delete(self) -> None:
        shutil.rmtree(os.path.join(get_repo_path(), self.uuid))
