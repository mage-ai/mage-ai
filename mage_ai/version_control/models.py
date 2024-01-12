import os
import shutil
import subprocess
from dataclasses import dataclass
from typing import Any, Dict, List

from mage_ai.data_preparation.preferences import Preferences, get_preferences
from mage_ai.settings.platform import platform_settings, update_settings
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import extract, merge_dict
from mage_ai.shared.models import BaseDataClass


@dataclass
class BaseVersionControl(BaseDataClass):
    project: Any = None

    def run(self, command: str) -> List[str]:
        args = [
            'git',
            '-C',
            self.repo_path,
        ] + command.split(' ')

        print(f'[VersionControl] Run: {" ".join(args)}')

        proc = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        return proc.stdout.decode().split('\n')

    @property
    def repo_path(self) -> str:
        return self.project.repo_path


@dataclass
class Remote(BaseVersionControl):
    name: str = None
    url: str = None

    @classmethod
    def load_from_text(self, line: str) -> Dict:
        name, url = line.split('\t')
        url = url.split('(')[0].strip()

        return self.load(
            name=name.strip(),
            url=url.strip(),
        )

    def hydrate(self) -> None:
        match = find(
            lambda x: x.name == self.name,
            [self.load_from_text(line) for line in self.list() if len(line) >= 1],
        )
        if match:
            self.url = match.url

    def list(self) -> List[str]:
        return self.run('remote -v')

    def create(self):
        return self.run(f'remote add {self.name} {self.url}')

    def delete(self):
        return self.run(f'remote rm {self.name}')

    def update(self, fetch: bool = False, set_url: bool = False):
        if fetch:
            return self.run(f'fetch {self.name}')
        elif set_url:
            return self.run(f'remote set-url {self.name} {self.url}')

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            name=self.name,
            project_uuid=self.project.uuid,
            repo_path=self.repo_path,
            url=self.url,
        )


@dataclass
class Branch(BaseVersionControl):
    name: str = None
    remote: Remote = None

    def list(self, include_all: bool = False) -> List[str]:
        commands = ['branch']
        if include_all:
            commands.append('-a')

        return self.run(' '.join(commands))

    def create(self):
        return self.run(f'checkout -b {self.name}')

    def detail(self):
        return self.run('log')

    def delete(self, name: str = None, force: bool = False):
        flag = 'd'
        if force:
            flag = flag.upper()
        return self.run(f'branch -{flag} {name or self.name}')

    def update(
        self,
        checkout: bool = False,
        clone: bool = False,
        merge: bool = False,
        pull: bool = False,
        push: bool = False,
        rebase: bool = False,
        reset: str = None,
    ):
        commands = []

        if clone:
            commands.append(f'clone -b {self.name}')
            if self.remote:
                commands.append(self.remote.url)
        elif pull or rebase:
            commands.append('rebase' if rebase else 'pull')
            if self.remote:
                commands.append(self.remote.name)
            commands.append(self.name)
        elif reset:
            commands.extend(['reset', reset])
        elif checkout or merge:
            commands.extend(['merge' if merge else 'checkout', self.name])
        elif push:
            commands.append('push -u')
            if self.remote:
                commands.append(self.remote.name)
            commands.append(self.name)

        return self.run(' '.join(commands))

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            name=self.name,
            project_uuid=self.project.uuid,
            remote=self.remote.to_dict(**kwargs) if self.remote else None,
            repo_path=self.repo_path,
        )


@dataclass
class File(BaseVersionControl):
    diff: List[str] = None
    name: str = None

    def list(
        self,
        staged: bool = False,     # Modified and git add already
        unstaged: bool = False,   # Modified but no git add yet
        untracked: bool = False,  # Modified but never checked in before
    ) -> str:
        if staged:
            return self.run('diff --name-only --staged')
        elif unstaged:
            return self.run('diff --name-only')
        elif untracked:
            return self.run('ls-files --others --exclude-standard')
        return self.run('ls-files --other --modified --exclude-standard')

    def create(self):
        return self.run(f'add {self.name}')

    def detail(self):
        self.diff = self.run(f'diff {self.name}')
        return self.diff

    def update(self, add: str = None, commit: str = None, reset: str = False):
        if add:
            return self.run(f'add {add}')
        elif commit:
            return self.run(f'commit -m "{commit}"')
        elif reset:
            return self.run(f'reset {reset}')

    def delete(self):
        return self.run(f'checkout {self.name}')

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            diff=self.diff,
            name=self.name,
            project_uuid=self.project.uuid,
            repo_path=self.repo_path,
        )


@dataclass
class Project(BaseVersionControl):
    branch: Branch = None
    file: File = None
    remote: Remote = None
    uuid: str = None

    def __post_init__(self):
        self.remote = Remote(project=self)
        self.branch = Branch(project=self)
        self.branch.remote = self.remote
        self.file = File(project=self)

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

        if uuid not in settings['version_control']:
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

    def exists(self) -> bool:
        settings = platform_settings() or {}
        if 'version_control' not in settings:
            return False

        if self.uuid not in settings['version_control']:
            return False

        return True

    def to_dict(self, **kwargs) -> Dict:
        return merge_dict(extract(self.preferences.to_dict(), [
            'sync_config',
        ]), dict(
            repo_path=self.repo_path,
            uuid=self.uuid,
        ))

    def initialize(self):
        if not os.path.exists(self.preferences.preferences_file_path):
            self.update(dict(
                sync_config=dict(
                    repo_path=self.repo_path,
                ),
            ))

        git_path = os.path.join(self.repo_path, '.git')
        if not os.path.exists(git_path):
            self.run('init')

    def update(self, settings: Dict = None):
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

    def configure(self, email: str = None, name: str = None):
        if email:
            self.run(f'config --global user.email "{email}"')
        if name:
            self.run(f'config --global user.name "{name}"')
