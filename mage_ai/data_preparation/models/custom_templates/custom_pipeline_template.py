import os
import shutil
import yaml
from dataclasses import dataclass, field
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.custom_templates.constants import (
    DIRECTORY_FOR_PIPELINE_TEMPLATES,
    METADATA_FILENAME_WITH_EXTENSION,
)
from mage_ai.data_preparation.models.custom_templates.utils import custom_templates_directory
from mage_ai.data_preparation.models.triggers import (
    TRIGGER_FILE_NAME,
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
    get_triggers_by_pipeline,
    load_trigger_configs,
)
from mage_ai.orchestration.db.models.schedules import PipelineSchedule
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.io import safe_write
from mage_ai.shared.utils import clean_name
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
            template_uuid=clean_name(template_uuid, [os.sep]) if template_uuid else template_uuid,
        )

        custom_template.save()

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
            get_repo_path(),
            self.uuid,
            METADATA_FILENAME_WITH_EXTENSION,
        )

    @property
    def triggers_file_path(self) -> str:
        return os.path.join(
            get_repo_path(),
            self.uuid,
            TRIGGER_FILE_NAME,
        )

    def build_pipeline(self) -> Pipeline:
        return Pipeline(clean_name(self.template_uuid), config=self.pipeline)

    def create_pipeline(self, name: str) -> Pipeline:
        pipeline = Pipeline(clean_name(name), config=self.pipeline)
        os.makedirs(os.path.dirname(pipeline.config_path), exist_ok=True)
        pipeline.save()

        if os.path.isfile(self.triggers_file_path):
            pipeline_uuid = pipeline.uuid

            with open(self.triggers_file_path, 'r') as f:
                content = f.read()

                for trigger in load_trigger_configs(content, pipeline_uuid=pipeline_uuid):
                    add_or_update_trigger_for_pipeline_and_persist(trigger, pipeline_uuid)

        return pipeline

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

    def save_triggers(self, triggers: List[Dict]) -> None:
        content = yaml.safe_dump(dict(triggers=[trigger.to_dict() for trigger in triggers]))
        file_path = self.triggers_file_path
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        safe_write(file_path, content)

    def delete(self) -> None:
        shutil.rmtree(os.path.join(get_repo_path(), self.uuid))
