import asyncio
import os
import re
import shutil
import subprocess
from asyncio.subprocess import PIPE, STDOUT
from dataclasses import dataclass
from typing import Any, Dict, List

from mage_ai.data_preparation.preferences import Preferences, get_preferences
from mage_ai.settings.platform import platform_settings, update_settings
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.array import find, unique_by
from mage_ai.shared.files import read_async
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.models import BaseDataClass


@dataclass
class BaseVersionControl(BaseDataClass):
    output: List[str] = None
    project: Any = None
    project_uuid: str = None

    def prepare_commands(self, command: str) -> List[str]:
        args = [
            'git',
            '-C',
            self.repo_path,
        ] + command.split(' ')

        print(f'[VersionControl] Run: {" ".join(args)}')

        return args

    async def run_async(self, command: str) -> List[str]:
        proc = await asyncio.create_subprocess_shell(
            ' '.join(self.prepare_commands(command)),
            stdin=PIPE,
            stdout=PIPE,
            stderr=STDOUT,
        )

        self.output = await proc.stdout.read()
        self.output = self.output.decode().split('\n') if self.output else self.output

        return self.output

    def run(self, command: str) -> List[str]:
        proc = subprocess.run(
            self.prepare_commands(command),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )

        self.output = proc.stdout.decode().split('\n')

        return self.output

    @property
    def repo_path(self) -> str:
        return self.project.repo_path if self.project else None

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            output=self.output,
            project_uuid=self.project.uuid if self.project else None,
            repo_path=self.repo_path,
        )


@dataclass
class Commit(BaseVersionControl):
    message: str = None
    sha: str = None


@dataclass
class Remote(BaseVersionControl):
    name: str = None
    url: str = None

    @classmethod
    def load_all(self, project: 'Project' = None) -> List['Remote']:
        lines = self(project=project).list()

        arr = []
        for remote in unique_by(
            [self.load_from_text(line) for line in lines if len(line) >= 1],
            lambda x: x.name,
        ):
            remote.project = project
            arr.append(remote)

        return arr

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

    def create(self) -> List[str]:
        return self.run(f'remote add {self.name} {self.url}')

    def delete(self) -> List[str]:
        return self.run(f'remote rm {self.name}')

    def update(self, fetch: bool = False, set_url: bool = False) -> List[str]:
        if fetch:
            return self.run(f'fetch {self.name}')
        elif set_url:
            return self.run(f'remote set-url {self.name} {self.url}')

        return ['Nothing was done.']

    def to_dict(self, **kwargs) -> Dict:
        return merge_dict(super().to_dict(**kwargs), dict(
            name=self.name,
            url=self.url,
        ))


@dataclass
class Branch(BaseVersionControl):
    current: bool = None
    name: str = None
    remote: Remote = None

    @classmethod
    def clean(self, line: str) -> str:
        if line.startswith('*'):
            line = line[1:].strip()
        return line.strip()

    @classmethod
    def load_all(
        self,
        lines: List[str] = None,
        remote: Remote = None,
        project: 'Project' = None,
    ) -> List['Branch']:
        base = self(project=project)

        if not lines:
            lines = base.list(include_all=True)

        mapping = {}
        arr = []
        for line in lines:
            if len(line) == 0:
                continue

            current = line.startswith('*')
            name = self.clean(line)
            if name not in mapping:
                mapping[name] = True
                model = self.load(current=current, name=name)
                model.remote = remote
                model.project = project
                arr.append(model)

        if len([line for line in base.list() if line and line.strip()]) == 0:
            # Need to fake a local branch until user makes a commit.
            model = Branch.load(current=True, name='master')
            model.remote = remote
            model.project = project
            arr.append(model)

        return arr

    def update_attributes(self, **kwargs) -> None:
        if kwargs:
            for k, v in kwargs.items():
                setattr(self, k, v)

        if self.name:
            model = find(
                lambda x, b=self: x.name == b.name,
                self.load_all(remote=self.remote, project=self.project),
            )
            if model:
                self.current = model.current

    def get_current_branch(self) -> 'Branch':
        return find(lambda x: x.current, self.load_all(
            lines=self.run('branch'),
            project=self.project,
            remote=self.remote,
        ))

    def list(self, include_all: bool = False) -> List[str]:
        commands = ['branch']
        if include_all:
            commands.append('-a')

        return self.run(' '.join(commands))

    def create(self) -> List[str]:
        return self.run(f'checkout -b {self.name}')

    def detail(self, log: bool = False) -> List[str]:
        outputs = []
        if log:
            outputs.extend(self.run('log'))
        return outputs

    def delete(self, name: str = None, force: bool = False) -> List[str]:
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
    ) -> List[str]:
        commands = []

        if clone:
            commands.append(f'clone -b {self.name}')
            if self.remote and self.remote.url:
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

        lines = self.run(' '.join(commands))
        self.update_attributes()

        return lines

    def to_dict(self, **kwargs) -> Dict:
        return merge_dict(super().to_dict(**kwargs), dict(
            current=self.current,
            name=self.name,
            remote=self.remote.to_dict(**kwargs) if self.remote else None,
        ))


@dataclass
class File(BaseVersionControl):
    additions: int = None
    content: str = None
    deletions: int = None
    diff: List[str] = None
    file_path: str = None
    name: str = None
    staged: bool = False
    unstaged: bool = False
    untracked: bool = False

    @classmethod
    def load_all(self, project: 'Project' = None) -> List['File']:
        lines_staged = self(project=project).list(staged=True)
        lines_unstaged = self(project=project).list(unstaged=True)
        lines_untracked = self(project=project).list(untracked=True)

        mapping = {}
        for opts, arr in [
            (dict(staged=True), lines_staged),
            (dict(unstaged=True), lines_unstaged),
            (dict(untracked=True), lines_untracked),
        ]:
            for line in arr:
                if line and line.strip():
                    file = File.load(name=line.strip(), **opts)
                    file.project = project
                    file_path = file.get_file_path()

                    if file_path in mapping:
                        file_prev = mapping[file_path]
                        file.staged = file.staged and file_prev.staged
                        file.unstaged = file.unstaged or file_prev.unstaged
                        file.untracked = file.untracked or file_prev.untracked
                    mapping[file_path] = file

        return sorted(list(mapping.values()), key=lambda x: x.name)

    def diff_stats(self, include_all: bool = False) -> Dict:
        lines = []
        if include_all:
            lines.extend(self.run('diff --stat'))
        else:
            lines.extend(self.run(f'diff --stat {self.name}'))

        mapping = {}

        # Remove the last line
        # 5 files changed, 232 insertions(+), 28 deletions(-)
        for line in lines[:-1]:
            line = line.strip()
            parts = line.split('|')
            if len(parts) != 2:
                continue

            name, stats = parts
            name = name.strip()
            stats = stats.strip()

            match = re.search(r'^[\d]+[ ]*([+-]+)$', stats)
            if match:
                symbols = match.group(1)
                additions = symbols.count('+')
                deletions = symbols.count('-')

                mapping[name] = dict(
                    additions=additions,
                    deletions=deletions,
                )

        if mapping.get(self.name):
            stats = mapping[self.name]
            self.additions = stats.get('additions')
            self.deletions = stats.get('deletions')

        return mapping

    def list(
        self,
        staged: bool = False,     # Modified and git add already
        unstaged: bool = False,   # Modified but no git add yet
        untracked: bool = False,  # Modified but never checked in before
    ) -> str:
        # A file can belong to staged and unstaged because it has unstaged modifications.
        outputs = []
        if staged:
            outputs.extend(self.run('diff --name-only --staged'))

        # Files with unstaged changes
        if unstaged:
            outputs.extend(self.run('diff --name-only'))

        if untracked:
            outputs.extend(self.run('ls-files --others --exclude-standard'))

        if not staged and not unstaged and not untracked:
            outputs.extend(self.run('ls-files --other --modified --exclude-standard'))

        self.output = outputs

        return outputs

    def create(self) -> List[str]:
        return self.run(f'add {self.name}')

    async def detail_async(self) -> List[str]:
        self.diff = await self.run_async(f'diff {self.name}')
        return self.diff

    async def read_content_async(self) -> str:
        self.content = await read_async(os.path.join(self.project.repo_path, self.name))
        return self.content

    def detail(self) -> List[str]:
        self.diff = self.run(f'diff {self.name}')
        return self.diff

    def update(self, add: str = None, commit: str = None, reset: str = False) -> List[str]:
        if add:
            return self.run(f'add {add}')
        elif commit:
            return self.run(f'commit -m "{commit}"')
        elif reset:
            return self.run(f'reset {reset}')

        return ['Nothing was done.']

    def delete(self) -> List[str]:
        return self.run(f'checkout {self.name}')

    def get_file_path(self) -> str:
        return self.file_path or os.path.join(self.repo_path, self.name)

    def to_dict(self, **kwargs) -> Dict:
        return merge_dict(super().to_dict(**kwargs), dict(
            additions=self.additions,
            content=self.content,
            deletions=self.deletions,
            diff=self.diff,
            file_path=self.get_file_path(),
            name=self.name,
            staged=self.staged,
            unstaged=self.unstaged,
            untracked=self.untracked,
        ))


@dataclass
class ProjectUser(BaseVersionControl):
    email: str = None
    name: str = None

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            email=self.email,
            name=self.name,
        )


@dataclass
class Project(BaseVersionControl):
    branch: Branch = None
    file: File = None
    remote: Remote = None
    sync_config: Dict = None
    user: ProjectUser = None
    uuid: str = None

    def __post_init__(self):
        self.remote = Remote(project=self)
        self.branch = Branch(project=self)
        self.branch.remote = self.remote
        self.file = File(project=self)
        self.user = ProjectUser(project=self)
        self.update_attributes()

    @classmethod
    def load_all(self) -> List['Project']:
        settings = (platform_settings() or {}).get('version_control') or {}
        uuids = list(settings.keys() if settings else [])
        return [self.load(uuid=uuid) for uuid in uuids]

    @classmethod
    def create(sefl, uuid: str) -> 'Project':
        settings = platform_settings() or {}
        if not settings.get('version_control'):
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

    def initialize(self) -> List[str]:
        if not os.path.exists(self.preferences.preferences_file_path):
            self.update(dict(
                sync_config=dict(
                    repo_path=self.repo_path,
                ),
            ))

        git_path = os.path.join(self.repo_path, '.git')
        if os.path.exists(git_path):
            return [f'.git already exists in {git_path}.']
        else:
            return self.run('init')

    def update(self, settings: Dict = None):
        self.preferences.update_preferences(settings)

    def update_attributes(self) -> None:
        user_email = self.run('config user.email')
        if user_email:
            self.user.email = ' '.join(user_email).replace('"', '').strip()

        user_name = self.run('config user.name')
        if user_name:
            self.user.name = ' '.join(user_name).replace('"', '').strip()

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

    def configure(self, email: str = None, name: str = None) -> List[str]:
        if email:
            return self.run(f'config --global user.email "{email}"')
        if name:
            return self.run(f'config --global user.name "{name}"')

        return ['Nothing was done.']

    def to_dict(self, **kwargs) -> Dict:
        sync_config = merge_dict(
            self.preferences.to_dict().get('sync_config') or {},
            self.sync_config or {},
        )

        return dict(
            output=self.output,
            repo_path=self.repo_path,
            sync_config=sync_config,
            user=self.user.to_dict(**kwargs) if self.user else None,
            uuid=self.uuid,
        )
