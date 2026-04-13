import copy
import os
import shutil
import uuid as uuid_lib
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import yaml

from mage_ai.data_preparation.models.constants import BLOCK_LANGUAGE_TO_FILE_EXTENSION
from mage_ai.data_preparation.models.custom_templates.constants import (
    DIRECTORY_FOR_PIPELINE_TEMPLATES,
    METADATA_FILENAME_WITH_EXTENSION,
)
from mage_ai.data_preparation.models.custom_templates.utils import (
    custom_templates_directory,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import (
    TRIGGER_FILE_NAME,
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
    get_triggers_by_pipeline,
    load_trigger_configs,
)
from mage_ai.data_preparation.templates.template import fetch_template_source
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.io import safe_write
from mage_ai.shared.utils import clean_name

BLOCKS_DIRECTORY = 'blocks'


@dataclass
class CustomPipelineTemplate(BaseConfig):
    description: str = None
    name: str = None
    pipeline: Dict = field(default_factory=dict)
    repo_path: str = None
    tags: List = field(default_factory=list)
    template_uuid: str = None
    user: Dict = field(default_factory=dict)

    @classmethod
    def load(self, repo_path: str, template_uuid: str = None, uuid: str = None):
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
                repo_path,
                uuid_use,
                METADATA_FILENAME_WITH_EXTENSION,
            )
            custom_template = super().load(config_path_metadata)
            custom_template.template_uuid = template_uuid_use
            custom_template.repo_path = repo_path

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
            repo_path=pipeline.repo_path,
            template_uuid=clean_name(template_uuid, [os.sep]) if template_uuid else template_uuid,
        )

        custom_template.save()
        custom_template._save_block_files(pipeline)

        triggers = get_triggers_by_pipeline(pipeline.uuid)

        pipeline_schedules = PipelineSchedule.query.filter(
            PipelineSchedule.pipeline_uuid == pipeline.uuid,
        ).all()
        for pipeline_schedule in pipeline_schedules:
            trigger = Trigger(
                name=pipeline_schedule.name,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
                schedule_interval=pipeline_schedule.schedule_interval,
                schedule_type=pipeline_schedule.schedule_type,
                settings=pipeline_schedule.settings,
                sla=pipeline_schedule.sla,
                start_time=pipeline_schedule.start_time,
                status=pipeline_schedule.status,
                variables=pipeline_schedule.variables,
            )
            triggers.append(trigger)

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
            self.repo_path,
            self.uuid,
            METADATA_FILENAME_WITH_EXTENSION,
        )

    @property
    def triggers_file_path(self) -> str:
        return os.path.join(
            self.repo_path,
            self.uuid,
            TRIGGER_FILE_NAME,
        )

    @property
    def blocks_dir(self) -> str:
        return os.path.join(self.repo_path, self.uuid, BLOCKS_DIRECTORY)

    def build_pipeline(self) -> Pipeline:
        return Pipeline(
            clean_name(self.template_uuid),
            config=self.pipeline,
            repo_path=self.repo_path,
        )

    def _block_file_ext(self, language: str) -> str:
        return BLOCK_LANGUAGE_TO_FILE_EXTENSION.get(language, 'py')

    def _save_block_files(self, pipeline: Pipeline) -> None:
        """Copy each block's source code into the template's blocks/ directory."""
        os.makedirs(self.blocks_dir, exist_ok=True)

        all_blocks = (
            list(pipeline.blocks_by_uuid.values())
            + list(pipeline.callbacks_by_uuid.values())
            + list(pipeline.conditionals_by_uuid.values())
            + list(pipeline.widgets_by_uuid.values())
        )
        for block in all_blocks:
            block_content = block.content
            if block_content:
                ext = self._block_file_ext(block.language)
                dest_path = os.path.join(self.blocks_dir, f'{block.uuid}.{ext}')
                safe_write(dest_path, block_content)

    def _read_template_block_content(self, block_uuid: str, language: str) -> Optional[str]:
        """Read a block's content from the template's blocks/ directory."""
        ext = self._block_file_ext(language)
        path = os.path.join(self.blocks_dir, f'{block_uuid}.{ext}')
        if os.path.isfile(path):
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        return None

    def create_pipeline(self, name: str) -> Pipeline:
        pipeline_config = copy.deepcopy(self.pipeline)

        # Build UUID map and pre-read content from template block files.
        uuid_map = {}
        content_by_new_uuid = {}

        for section in ('blocks', 'callbacks', 'conditionals', 'widgets'):
            for block_config in pipeline_config.get(section) or []:
                old_uuid = block_config['uuid']
                new_uuid = f'{old_uuid}_{uuid_lib.uuid4().hex[:8]}'
                uuid_map[old_uuid] = new_uuid
                language = block_config.get('language', 'python')
                content_by_new_uuid[new_uuid] = self._read_template_block_content(
                    old_uuid, language
                )

        for ext_config in (pipeline_config.get('extensions') or {}).values():
            for block_config in ext_config.get('blocks') or []:
                old_uuid = block_config['uuid']
                new_uuid = f'{old_uuid}_{uuid_lib.uuid4().hex[:8]}'
                uuid_map[old_uuid] = new_uuid
                language = block_config.get('language', 'python')
                content_by_new_uuid[new_uuid] = self._read_template_block_content(
                    old_uuid, language
                )

        def remap_block(bc):
            bc = bc.copy()
            bc['uuid'] = uuid_map[bc['uuid']]
            bc['upstream_blocks'] = [uuid_map.get(u, u) for u in bc.get('upstream_blocks') or []]
            bc['downstream_blocks'] = [uuid_map.get(d, d) for d in bc.get('downstream_blocks') or []]
            return bc

        for section in ('blocks', 'callbacks', 'conditionals', 'widgets'):
            pipeline_config[section] = [remap_block(b) for b in pipeline_config.get(section) or []]
        for ext_uuid, ext_config in (pipeline_config.get('extensions') or {}).items():
            pipeline_config['extensions'][ext_uuid]['blocks'] = [
                remap_block(b) for b in ext_config.get('blocks') or []
            ]

        pipeline = Pipeline(
            clean_name(name),
            repo_path=self.repo_path,
            config=pipeline_config,
        )
        os.makedirs(os.path.dirname(pipeline.config_path), exist_ok=True)
        pipeline.save()

        all_blocks = (
            list(pipeline.blocks_by_uuid.values())
            + list(pipeline.callbacks_by_uuid.values())
            + list(pipeline.conditionals_by_uuid.values())
            + list(pipeline.widgets_by_uuid.values())
        )
        for block in all_blocks:
            block.file.create_parent_directories(block.file_path)
            block_content = content_by_new_uuid.get(block.uuid)
            if not block_content:
                try:
                    block_content = fetch_template_source(
                        block.type,
                        {},
                        language=block.language,
                        pipeline_type=pipeline.type,
                    )
                except Exception:
                    block_content = ''
            block.file.update_content(block_content)

        if os.path.isfile(self.triggers_file_path):
            pipeline_uuid = pipeline.uuid
            with open(self.triggers_file_path, 'r') as f:
                content = f.read()
                for trigger in load_trigger_configs(content, pipeline_uuid=pipeline_uuid):
                    add_or_update_trigger_for_pipeline_and_persist(trigger, pipeline_uuid)

        return pipeline

    def to_dict(self) -> Dict:
        return merge_dict(
            self.to_dict_base(),
            dict(
                template_uuid=self.template_uuid,
                uuid=self.uuid,
            ),
        )

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

    def save_triggers(self, triggers: List[Dict]) -> None:
        content = yaml.safe_dump(dict(triggers=[trigger.to_dict() for trigger in triggers]))
        file_path = self.triggers_file_path
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        safe_write(file_path, content)

    def delete(self) -> None:
        shutil.rmtree(os.path.join(self.repo_path, self.uuid))
