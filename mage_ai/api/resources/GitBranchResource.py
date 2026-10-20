import os
from typing import Dict, List, Tuple

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.data_preparation.git import REMOTE_NAME, Git, api
from mage_ai.data_preparation.git.clients.base import Client as GitClient
from mage_ai.data_preparation.git.utils import (
    get_oauth_access_token_for_user,
    get_provider_from_remote_url,
)
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.server.logger import Logger
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.path_fixer import remove_base_repo_path
from mage_ai.shared.strings import capitalize_remove_underscore_lower

logger = Logger().new_server_logger(__name__)


def build_file_object(obj):
    arr = []
    for k, v in obj.items():
        children = build_file_object(v)
        arr.append(
            dict(
                children=children if len(children) >= 1 else None,
                name=k,
            )
        )

    return arr


class GitBranchResource(GenericResource):
    @classmethod
    def get_git_manager(
        self,
        user=None,
        context_data: Dict = None,
        preferences=None,
        repo_path: str = None,
        setup_repo: bool = False,
        config_overwrite: Dict = None,
    ) -> Git:
        return Git.get_manager(
            context_data=context_data,
            preferences=preferences,
            repo_path=repo_path,
            setup_repo=setup_repo,
            user=user,
        )

    @classmethod
    def collection(self, query, meta, user, **kwargs):
        arr = []

        include_remote_branches = query.get('include_remote_branches', None)
        if include_remote_branches:
            include_remote_branches = include_remote_branches[0]

        remote_url = query.get('remote_url', None)
        if remote_url:
            remote_url = remote_url[0]

        repository = query.get('repository', None)
        if repository:
            repository = repository[0]

            provider = ProviderName.GITHUB
            if remote_url:
                provider = get_provider_from_remote_url(remote_url)

            access_token = get_oauth_access_token_for_user(user, provider=provider)
            if access_token:
                branches = GitClient.get_client_for_provider(provider)(
                    access_token.token
                ).get_branches(repository)
                arr = [dict(name=branch) for branch in branches]
        else:
            git_manager = self.get_git_manager(user=user)
            arr += [dict(name=branch) for branch in git_manager.branches]

            if include_remote_branches:
                try:
                    git_manager.fetch()
                    mage_remote = git_manager.origin
                    arr += [
                        dict(name=ref.name)
                        for ref in mage_remote.refs
                    ]
                except Exception:
                    logger.warning('Failed to fetch remote branches')

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        branch = payload.get('name')
        remote = payload.get('remote')
        git_manager = self.get_git_manager(user=user)
        git_manager.switch_branch(branch, remote=remote)

        return self(dict(name=git_manager.current_branch), user, **kwargs)

    @classmethod
    async def member(self, pk, user, **kwargs):
        context_data = kwargs.get('context_data')
        repo_path = get_repo_path(context_data=context_data, user=user)
        preferences = get_preferences(
            repo_path=repo_path,
            user=user,
        )
        setup_repo = False
        if preferences.is_git_integration_enabled():
            setup_repo = True
        git_manager = self.get_git_manager(
            user=user,
            context_data=context_data,
            preferences=preferences,
            repo_path=repo_path,
            setup_repo=setup_repo,
        )

        display_format = kwargs.get('meta', {}).get('_format')
        if 'with_basic_details' == display_format:
            return self(
                dict(
                    files={},
                    is_git_integration_enabled=preferences.is_git_integration_enabled(),
                    modified_files=[],
                    name=git_manager.current_branch,
                    staged_files=[],
                    sync_config=preferences.sync_config,
                    untracked_files=[],
                ),
                user,
                **kwargs,
            )

        modified_files = git_manager.modified_files
        staged_files = await git_manager.staged_files()
        untracked_files = await git_manager.untracked_files()

        return self(
            dict(
                files={},
                is_git_integration_enabled=preferences.is_git_integration_enabled(),
                modified_files=modified_files,
                name=git_manager.current_branch,
                staged_files=staged_files,
                sync_config=preferences.sync_config,
                untracked_files=untracked_files,
            ),
            user,
            **kwargs,
        )

    @classmethod
    def get_oauth_config(
        cls,
        remote_url: str = None,
        remote_name: str = None,
        user=None,
    ) -> Tuple[str, str, str, Dict]:
        git_manager = cls.get_git_manager(user=user)
        url = None
        if remote_url:
            url = remote_url
        elif remote_name:
            remote = git_manager.repo.remotes[remote_name]
            url = list(remote.urls)[0]

        provider = ProviderName.GITHUB
        if url:
            provider = get_provider_from_remote_url(url)

        access_token = get_oauth_access_token_for_user(
            user, provider=provider
        )
        http_access_token = git_manager.get_access_token()

        config_overwrite = None
        token = None
        if access_token:
            token = access_token.token
            user_from_api = api.get_user(token, provider=provider)
            # Default to mage user email if no email is returned from API
            email = user_from_api.get('email')
            if email is None and user:
                email = user.email
            config_overwrite = dict(
                username=user_from_api.get('username'),
                email=email,
            )
        elif http_access_token:
            token = http_access_token

        return token, provider, url, config_overwrite

    async def update(self, payload, **kwargs):
        query = kwargs.get('query') or {}

        git_manager = self.get_git_manager(user=self.current_user)
        action_type = payload.get('action_type')
        action_payload = payload.get('action_payload', dict())
        action_remote = action_payload.get('remote', None)
        action_branch = action_payload.get('branch', None)
        action_arg = action_payload.get('arg', None)

        # Eventually we would want to give the user the ability to pass in multiple
        # arguments to the action, but for now we will just pass in a single argument.
        action_kwargs = dict()
        if action_arg:
            action_kwargs[action_arg] = True

        files = payload.get('files', None)
        message = payload.get('message', None)

        remote_url = query.get('remote_url', None)
        if remote_url:
            remote_url = remote_url[0]

        token, provider, url, config_overwrite = self.get_oauth_config(
            remote_url=remote_url,
            remote_name=action_remote,
            user=self.current_user,
        )

        # Recreate git manager with updated config
        git_manager = self.get_git_manager(
            user=self.current_user, config_overwrite=config_overwrite
        )

        if action_type == 'status':
            status = git_manager.status()
            untracked_files = await git_manager.untracked_files()
            modified_files = git_manager.modified_files
            self.model = dict(
                name=git_manager.current_branch,
                status=status,
                untracked_files=untracked_files,
                modified_files=modified_files,
            )
        elif action_type == 'commit':
            if not message:
                error = ApiError.RESOURCE_ERROR
                error.update(
                    {
                        'message': 'Message is empty, please add a message for your commit.',
                    }
                )
                raise ApiError(error)

            git_manager.commit(message, files)
        elif action_type == 'push':
            if action_remote:
                from git.exc import GitCommandError

                try:
                    if token:
                        custom_progress = api.push(
                            action_remote,
                            url,
                            action_branch,
                            token,
                            config_overwrite=config_overwrite,
                            **action_kwargs,
                        )
                        if custom_progress.other_lines:
                            lines = custom_progress.other_lines
                            if isinstance(lines, list):
                                lines = '\n'.join(lines)
                            self.model['progress'] = lines
                    else:
                        self.model[
                            'error'
                        ] = 'Please authenticate with {} before trying to push.'.format(
                            capitalize_remove_underscore_lower(provider),
                        )
                except GitCommandError as err:
                    self.model['error'] = str(err)
            else:
                git_manager.push()
        elif action_type == 'pull':
            if action_remote:
                from git.exc import GitCommandError

                try:
                    if token:
                        custom_progress = None
                        if action_branch:
                            custom_progress = api.pull(
                                action_remote,
                                url,
                                action_branch,
                                token,
                                config_overwrite=config_overwrite,
                                **action_kwargs,
                            )
                        else:
                            custom_progress = api.fetch(
                                action_remote,
                                url,
                                token,
                                config_overwrite=config_overwrite,
                                **action_kwargs,
                            )

                        if custom_progress and custom_progress.other_lines:
                            lines = custom_progress.other_lines
                            if isinstance(lines, list):
                                lines = '\n'.join(lines)
                            self.model['progress'] = lines
                    else:
                        self.model[
                            'error'
                        ] = 'Please authenticate with {} before trying to pull.'.format(
                            capitalize_remove_underscore_lower(provider),
                        )
                except GitCommandError as err:
                    self.model['error'] = str(err)
            else:
                git_manager.pull()
        elif action_type == 'fetch':
            if action_remote:
                from git.exc import GitCommandError

                try:
                    if token:
                        custom_progress = api.fetch(
                            action_remote,
                            url,
                            token,
                            config_overwrite=config_overwrite,
                            **action_kwargs,
                        )

                        if custom_progress and custom_progress.other_lines:
                            lines = custom_progress.other_lines
                            if isinstance(lines, list):
                                lines = '\n'.join(lines)
                            self.model['progress'] = lines
                    else:
                        self.model[
                            'error'
                        ] = 'Please authenticate with {} before trying to fetch.'.format(
                            capitalize_remove_underscore_lower(provider),
                        )
                except GitCommandError as err:
                    self.model['error'] = str(err)
            else:
                self.model['error'] = 'Please specify a remote for the fetch command'
        elif action_type == 'reset':
            if files and len(files) >= 1:
                for file_path in files:
                    git_manager.reset_file(file_path)
            else:
                if action_remote:
                    from git.exc import GitCommandError

                    try:
                        if token:
                            api.reset_hard(
                                action_remote,
                                url,
                                action_branch,
                                token,
                                config_overwrite=config_overwrite,
                                **action_kwargs,
                            )
                        else:
                            self.model[
                                'error'
                            ] = 'Please authenticate with {} before trying to reset.'.format(
                                capitalize_remove_underscore_lower(provider),
                            )
                    except GitCommandError as err:
                        self.model['error'] = str(err)
        elif action_type == 'clone':
            if action_remote:
                from git.exc import GitCommandError

                try:
                    if token:
                        api.clone(
                            action_remote,
                            url,
                            token,
                            config_overwrite=config_overwrite,
                            **action_kwargs,
                        )
                    else:
                        self.model[
                            'error'
                        ] = 'Please authenticate with {} before trying to clone.'.format(
                            capitalize_remove_underscore_lower(provider),
                        )
                except GitCommandError as err:
                    self.model['error'] = str(err)
            else:
                git_manager.clone()
        elif action_type == 'add':
            for file_path in files:
                git_manager.add_file(file_path, ['-f'])
        elif action_type == 'checkout':
            for file_path in files:
                git_manager.checkout_file(file_path)
        elif action_type in ['add_remote', 'remove_remote']:
            if not action_payload:
                error = ApiError.RESOURCE_ERROR
                error.update(
                    {
                        'message': 'Remote is empty, please add a remote.',
                    }
                )
                raise ApiError(error)

            args = []
            keys = ['name']

            if action_type == 'add_remote':
                keys.append('url')

            for key in keys:
                val = action_payload.get(key)
                if not val:
                    error = ApiError.RESOURCE_ERROR
                    error.update(
                        {
                            'message': f'Remote is missing {key}.',
                        }
                    )
                    raise ApiError(error)
                args.append(val)

            if action_type == 'add_remote':
                if action_payload.get('name') == REMOTE_NAME:
                    error = ApiError.RESOURCE_ERROR
                    error.update(
                        {
                            'message': f'Remote name {REMOTE_NAME} is reserved, '
                            + 'please select a different name.',
                        }
                    )
                    raise ApiError(error)
                git_manager.add_remote(*args)
            elif action_type == 'remove_remote':
                git_manager.remove_remote(*args)
        elif action_type in [
            'delete',
            'merge',
            'rebase',
        ]:
            if action_payload:
                base_branch = action_payload.get('base_branch')

                if 'delete' == action_type:
                    git_manager.delete_branch(base_branch)
                elif 'merge' == action_type:
                    git_manager.merge_branch(base_branch, message=message)
                elif 'rebase' == action_type:
                    git_manager.rebase_branch(base_branch, message=message)
            else:
                error = ApiError.RESOURCE_ERROR
                error.update(
                    {
                        'message': 'Please select a base branch to '
                        + f'{action_type} into the current branch.',
                    }
                )
                raise ApiError(error)

        return self

    async def files(
        self,
        modified_files: List[str],
        staged_files: List[str],
        untracked_files: List[str],
        limit: int = None,
    ) -> Dict:
        git_manager = self.get_git_manager(user=self.current_user)

        arr = []

        if modified_files and isinstance(modified_files, list):
            arr += modified_files
        if staged_files and isinstance(staged_files, list):
            arr += staged_files
        if untracked_files and isinstance(untracked_files, list):
            arr += untracked_files

        if limit:
            arr = arr[:limit]

        files_absolute_path = {}

        files = {}
        for filename_init in arr:

            # Git repo_path: /home/src/project_romeo/test
            # filename_init: examples/load.py
            # filename: test/examples/load.py

            filename = os.path.join(
                os.path.basename(git_manager.repo_path),
                filename_init,
            )

            parts = filename.split(os.sep)
            number_of_parts = len(parts)

            arr = []
            for idx, part in enumerate(parts):
                default_obj = dict()

                if idx == 0:
                    obj = files.get(part, default_obj)
                else:
                    obj_prev = arr[idx - 1]
                    obj = obj_prev.get(part, default_obj)

                arr.append(obj)

            obj_final = None
            for idx, obj in enumerate(reversed(arr)):
                if idx == 0:
                    obj_final = obj
                else:
                    part = parts[number_of_parts - idx]
                    obj[part] = obj_final
                    obj_final = obj

            key = parts[0]
            files[key] = obj_final
            files_absolute_path[filename_init] = remove_base_repo_path(
                os.path.join(git_manager.repo_path, filename_init),
            )

        self.model['files_absolute_path'] = files_absolute_path

        return build_file_object(files)

    def logs(self, commits: int = None) -> List[Dict]:
        git_manager = self.get_git_manager(user=self.current_user)
        return git_manager.logs(commits=commits)

    def remotes(self, limit: int = None) -> List[Dict]:
        git_manager = self.get_git_manager(user=self.current_user)
        return git_manager.remotes(limit=limit, user=self.current_user)
