import os
import shutil
import subprocess
from dataclasses import dataclass
from typing import Dict, List

from mage_ai.data_preparation.preferences import Preferences, get_preferences
from mage_ai.settings.platform import platform_settings, update_settings
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.models import BaseDataClass


@dataclass
class Project(BaseDataClass):
    uuid: str

    @classmethod
    def load_all(self) -> List['Project']:
        settings = (platform_settings() or {}).get('version_control') or {}
        uuids = list(settings.keys() if settings else [])
        return [self.load(uuid=uuid) for uuid in uuids]

    @classmethod
    def create(sefl, uuid: str) -> 'Project':
        settings = platform_settings() or {}
        if 'version_control' not in settings:
            settings['version_control'] = {}
        settings['version_control'][uuid] = {}
        update_settings(settings)

        project = Project.load(uuid=uuid)
        project.initialize()

        return project

    @property
    def preferences(self) -> Preferences:
        return get_preferences(self.repo_path)

    @property
    def repo_path(self) -> str:
        return os.path.join(base_repo_path(), self.uuid)

    def initialize(self):
        self.update(dict(
            sync_config=dict(
                repo_path=self.repo_path,
            ),
        ))
        Controller(project=self).run('init')

    def update(self, settings: Dict = {}):
        self.preferences.update_preferences(settings)

    def delete(self):
        git_path = os.path.join(self.repo_path, '.git')
        if os.path.exists(git_path):
            shutil.rmtree(git_path)

        if os.path.exists(self.preferences.preferences_file_path):
            os.remove(self.preferences.preferences_file_path)

        settings = platform_settings() or {}
        if 'version_control' in settings and self.uuid in settings.get('version_control'):
            settings['version_control'].pop(self.uuid, None)
        update_settings(settings)


@dataclass
class Controller(BaseDataClass):
    project: Project

    def __post_init__(self):
        self.serialize_attribute_class('project', Project)

    def run(self, command: str) -> List[str]:
        proc = subprocess.run([
            'git',
            '-C',
            self.project.repo_path,
            command
        ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        return proc.stdout.decode().split('\n')
