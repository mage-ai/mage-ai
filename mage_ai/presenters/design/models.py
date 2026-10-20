import os
from dataclasses import dataclass
from typing import Dict, List

import yaml

from mage_ai.data_preparation.models.project.models import ProjectDataClass
from mage_ai.presenters.design.constants import CUSTOM_DESIGN_FILENAME
from mage_ai.settings.platform import (
    active_project_settings,
    build_repo_path_for_all_projects,
    project_platform_activated,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.settings.utils import base_repo_name, base_repo_path
from mage_ai.shared.hash import combine_into
from mage_ai.shared.io import safe_write
from mage_ai.shared.models import BaseDataClass
from mage_ai.shared.path_fixer import remove_base_repo_directory_name


@dataclass
class DesignComponentConfigurations(BaseDataClass):
    media: Dict = None


@dataclass
class DesignComponents(BaseDataClass):
    header: DesignComponentConfigurations = None

    def __post_init__(self):
        self.serialize_attribute_class('header', DesignComponentConfigurations)


@dataclass
class UIElementConfigurations(BaseDataClass):
    items: List[str] = None
    items_more: List[str] = None


@dataclass
class UIComponentConfigurations(BaseDataClass):
    add: UIElementConfigurations = None

    def __post_init__(self):
        self.serialize_attribute_class('add', UIElementConfigurations)


@dataclass
class ResourceUIComponentConfigurations(BaseDataClass):
    block: UIComponentConfigurations

    def __post_init__(self):
        self.serialize_attribute_class('block', UIComponentConfigurations)


@dataclass
class PageComponentConfigurations(BaseDataClass):
    buttons: ResourceUIComponentConfigurations = None

    def __post_init__(self):
        self.serialize_attribute_class('buttons', ResourceUIComponentConfigurations)


@dataclass
class DesignPageConfigurations(BaseDataClass):
    edit: PageComponentConfigurations = None
    list: PageComponentConfigurations = None

    def __post_init__(self):
        self.serialize_attribute_class('edit', PageComponentConfigurations)
        self.serialize_attribute_class('list', PageComponentConfigurations)


@dataclass
class DesignPages(BaseDataClass):
    pipelines: DesignPageConfigurations = None
    triggers: DesignPageConfigurations = None

    def __post_init__(self):
        self.serialize_attribute_class('pipelines', DesignPageConfigurations)


@dataclass
class CustomDesign(BaseDataClass):
    components: DesignComponents = None
    custom_designs: Dict = None
    pages: DesignPages = None
    project: ProjectDataClass = None
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_class('components', DesignComponents)
        self.serialize_attribute_class('pages', DesignPages)
        self.serialize_attribute_class('project', ProjectDataClass)

    @classmethod
    def file_path(self, repo_path: str = None) -> str:
        return os.path.join(repo_path or get_repo_path(), CUSTOM_DESIGN_FILENAME)

    @classmethod
    def load_from_file(
        self,
        all_configurations: bool = True,
        file_path: str = None,
        repo_path: str = None,
        project: Dict = None,
    ) -> 'CustomDesign':
        model = self.__load_from_file(file_path=file_path, project=project, repo_path=repo_path)

        if all_configurations and project_platform_activated():
            model.custom_designs = {}

            for project_name, project in build_repo_path_for_all_projects(
                mage_projects_only=True,
            ).items():
                full_path = project['full_path']
                if os.path.exists(full_path):
                    model.custom_designs[project_name] = self.__load_from_file(
                        file_path=os.path.join(full_path, CUSTOM_DESIGN_FILENAME),
                        project=project,
                    )

        return model

    @classmethod
    def __load_from_file(
        self,
        file_path: str = None,
        project: Dict = None,
        repo_path: str = None,
    ) -> 'CustomDesign':
        yaml_config = {}

        file_path_to_use = file_path or self.file_path(repo_path=repo_path)
        if os.path.exists(file_path_to_use):
            with open(file_path_to_use, 'r') as fp:
                content = fp.read()
                if content:
                    yaml_config = yaml.safe_load(content) or {}

        return self.load(
            project=project,
            uuid=(project.get('uuid') if project else None) or (
                remove_base_repo_directory_name(
                    repo_path or os.path.dirname(file_path_to_use),
                ) if file_path_to_use else None
            ),
            **yaml_config,
        )

    @classmethod
    def get_all(self) -> List['CustomDesign']:
        custom_design = self.load_from_file(all_configurations=True)

        arr = []

        if custom_design.custom_designs:
            arr.extend(list(custom_design.custom_designs.values()))
        else:
            arr.append(custom_design)

        return arr

    @classmethod
    def combine_in_order_of_priority(self) -> 'CustomDesign':
        custom_design = self.load_from_file(
            all_configurations=True,
            repo_path=base_repo_path(),
        )

        if not project_platform_activated() or not custom_design.custom_designs:
            return custom_design

        settings = (active_project_settings(get_default=True) or {})
        active_project_uuid = settings.get('uuid')
        root_project_uuid = base_repo_name()
        if active_project_uuid == root_project_uuid:
            return custom_design

        child = custom_design.custom_designs.get(active_project_uuid) or {}
        child = child.to_dict() if child else {}
        parent = custom_design.to_dict()

        # Active project settings supercede root project settings
        combine_into(child, parent)

        return self.load(uuid=active_project_uuid, **parent)

    def save(self, file_path: str = None, repo_path: str = None) -> None:
        if not file_path:
            file_path = self.file_path(repo_path=repo_path)

        content_original = None
        if os.path.exists(file_path):
            with open(file_path) as f:
                content_original = f.read()

        with open(file_path, 'w'):
            try:
                data = self.to_dict()
                content = yaml.safe_dump(data)
                safe_write(file_path, content)
            except Exception as err:
                if content_original:
                    safe_write(file_path, content_original)
                raise err

    def to_dict(self, **kwargs) -> Dict:
        return super().to_dict(
            convert_enum=True,
            ignore_attributes=['custom_designs', 'uuid'],
            ignore_empty=True,
        )
