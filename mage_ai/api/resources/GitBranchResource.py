import os
from typing import Dict, List

from github import Auth, Github

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import REMOTE_NAME, Git, api
from mage_ai.data_preparation.preferences import get_preferences


def build_file_object(obj):
    arr = []
    for k, v in obj.items():
        children = build_file_object(v)
        arr.append(dict(
            children=children if len(children) >= 1 else None,
            name=k,
        ))

    return arr


class GitBranchResource(GenericResource):
    @classmethod
    def get_git_manager(self, user, setup_repo: bool = True) -> Git:
        return Git.get_manager(setup_repo=setup_repo, user=user)

    @classmethod
    def collection(self, query, meta, user, **kwargs):
        arr = []

        include_remote_branches = query.get('include_remote_branches', None)
        if include_remote_branches:
            include_remote_branches = include_remote_branches[0]

        repository = query.get('repository', None)
        if repository:
            repository = repository[0]

            access_token = api.get_access_token_for_user(user)
            if access_token:
                auth = Auth.Token(access_token.token)
                g = Github(auth=auth)
                repo = g.get_repo(repository)
                branches = repo.get_branches()

                for branch in branches:
                    arr.append(dict(name=branch.name))
        else:
            git_manager = self.get_git_manager(user=user)
            arr += [dict(name=branch) for branch in git_manager.branches]

            if include_remote_branches:
                pass

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        branch = payload.get('name')
        git_manager = self.get_git_manager(user=user)
        git_manager.switch_branch(branch)

        return self(dict(name=git_manager.current_branch), user, **kwargs)

    @classmethod
    async def member(self, pk, user, **kwargs):
        preferences = get_preferences(user=user)
        setup_repo = False
        if preferences.is_git_integration_enabled():
            setup_repo = True
        git_manager = self.get_git_manager(user=user, setup_repo=setup_repo)

        display_format = kwargs.get('meta', {}).get('_format')
        if 'with_basic_details' == display_format:
            return self(dict(
                files={},
                is_git_integration_enabled=preferences.is_git_integration_enabled(),
                modified_files=[],
                name=git_manager.current_branch,
                staged_files=[],
                sync_config=get_preferences().sync_config,
                untracked_files=[],
            ), user, **kwargs)

        modified_files = git_manager.modified_files
        staged_files = await git_manager.staged_files()
        untracked_files = await git_manager.untracked_files()

        return self(dict(
            files={},
            is_git_integration_enabled=preferences.is_git_integration_enabled(),
            modified_files=modified_files,
            name=git_manager.current_branch,
            staged_files=staged_files,
            sync_config=get_preferences().sync_config,
            untracked_files=untracked_files,
        ), user, **kwargs)

    async def update(self, payload, **kwargs):
        git_manager = self.get_git_manager(user=self.current_user)
        action_type = payload.get('action_type')
        files = payload.get('files', None)
        message = payload.get('message', None)
        remote = payload.get('remote', None)

        access_token = api.get_access_token_for_user(self.current_user)
        http_access_token = git_manager.get_access_token()

        token = None
        if access_token:
            token = access_token.token
        elif http_access_token:
            token = http_access_token

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
                error.update({
                    'message': 'Message is empty, please add a message for your commit.',
                })
                raise ApiError(error)
            git_manager.commit(message, files)
        elif action_type == 'push':
            push = payload.get('push', None)

            if push and 'remote' in push and 'branch' in push:
                from git.exc import GitCommandError

                try:
                    remote = git_manager.repo.remotes[push['remote']]
                    url = list(remote.urls)[0]

                    if token:
                        custom_progress = api.push(
                            remote.name,
                            url,
                            push['branch'],
                            token,
                        )
                        if custom_progress.other_lines:
                            lines = custom_progress.other_lines
                            if type(lines) is list:
                                lines = '\n'.join(lines)
                            self.model['progress'] = lines
                    else:
                        self.model['error'] = \
                            'Please authenticate with GitHub before trying to push.'
                except GitCommandError as err:
                    self.model['error'] = str(err)
            else:
                git_manager.push()
        elif action_type == 'pull':
            pull = payload.get('pull', None)
            if pull and 'remote' in pull:
                from git.exc import GitCommandError

                try:
                    branch_name = pull.get('branch')
                    remote = git_manager.repo.remotes[pull['remote']]
                    url = list(remote.urls)[0]

                    if token:
                        custom_progress = None
                        if branch_name:
                            custom_progress = api.pull(
                                remote.name,
                                url,
                                pull.get('branch'),
                                token,
                            )
                        else:
                            custom_progress = api.fetch(
                                remote.name,
                                url,
                                token,
                            )

                        if custom_progress and custom_progress.other_lines:
                            lines = custom_progress.other_lines
                            if type(lines) is list:
                                lines = '\n'.join(lines)
                            self.model['progress'] = lines
                    else:
                        self.model['error'] = \
                            'Please authenticate with GitHub before trying to pull.'
                except GitCommandError as err:
                    self.model['error'] = str(err)
            else:
                git_manager.pull()
        elif action_type == 'fetch':
            fetch = payload.get('fetch', None)
            if fetch and 'remote' in fetch:
                from git.exc import GitCommandError

                try:
                    remote = git_manager.repo.remotes[fetch['remote']]
                    url = list(remote.urls)[0]

                    if token:
                        custom_progress = api.fetch(
                            remote.name,
                            url,
                            token,
                        )

                        if custom_progress and custom_progress.other_lines:
                            lines = custom_progress.other_lines
                            if type(lines) is list:
                                lines = '\n'.join(lines)
                            self.model['progress'] = lines
                    else:
                        self.model['error'] = \
                            'Please authenticate with GitHub before trying to fetch.'
                except GitCommandError as err:
                    self.model['error'] = str(err)
            else:
                self.model['error'] = 'Please specify a remote for the fetch command'
        elif action_type == 'reset':
            if files and len(files) >= 1:
                for file_path in files:
                    git_manager.reset_file(file_path)
            else:
                reset = payload.get('reset', {})
                if reset and 'remote' in reset:
                    from git.exc import GitCommandError

                    try:
                        branch_name = reset.get('branch')
                        remote = git_manager.repo.remotes[reset['remote']]
                        url = list(remote.urls)[0]

                        if token:
                            api.reset_hard(
                                remote.name,
                                url,
                                branch_name,
                                token,
                            )
                        else:
                            self.model['error'] = \
                                'Please authenticate with GitHub before trying to pull.'
                    except GitCommandError as err:
                        self.model['error'] = str(err)
        elif action_type == 'clone':
            clone = payload.get('clone', None)
            if clone and 'remote' in clone:
                from git.exc import GitCommandError
                try:
                    remote = git_manager.repo.remotes[clone['remote']]
                    url = list(remote.urls)[0]

                    if token:
                        api.clone(
                            remote.name,
                            url,
                            token,
                        )
                    else:
                        self.model['error'] = \
                            'Please authenticate with GitHub before trying to pull.'
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
            if not remote:
                error = ApiError.RESOURCE_ERROR
                error.update({
                    'message': 'Remote is empty, please add a remote.',
                })
                raise ApiError(error)

            args = []
            keys = ['name']

            if action_type == 'add_remote':
                keys.append('url')

            for key in keys:
                val = remote.get(key)
                if not val:
                    error = ApiError.RESOURCE_ERROR
                    error.update({
                        'message': f'Remote is missing {key}.',
                    })
                    raise ApiError(error)
                args.append(val)

            if action_type == 'add_remote':
                if remote.get('name') == REMOTE_NAME:
                    error = ApiError.RESOURCE_ERROR
                    error.update({
                        'message': f'Remote name {REMOTE_NAME} is reserved, ' +
                        'please select a different name.',
                    })
                    raise ApiError(error)
                git_manager.add_remote(*args)
            elif action_type == 'remove_remote':
                git_manager.remove_remote(*args)
        elif action_type in [
            'delete',
            'merge',
            'rebase',
        ]:
            data = payload.get('delete', None) or \
                payload.get('merge', None) or \
                payload.get('rebase', None)

            if data and 'base_branch' in data:
                base_branch = data['base_branch']

                if 'delete' == action_type:
                    git_manager.delete_branch(base_branch)
                elif 'merge' == action_type:
                    git_manager.merge_branch(base_branch, message=message)
                elif 'rebase' == action_type:
                    git_manager.rebase_branch(base_branch, message=message)
            else:
                error = ApiError.RESOURCE_ERROR
                error.update({
                    'message': 'Please select a base branch to ' +
                    f'{action_type} into the current branch.',
                })
                raise ApiError(error)

        return self

    async def files(
        self,
        modified_files: List[str],
        staged_files: List[str],
        untracked_files: List[str],
        limit: int = None
    ) -> Dict:
        arr = []

        if modified_files and isinstance(modified_files, list):
            arr += modified_files
        if staged_files and isinstance(staged_files, list):
            arr += staged_files
        if untracked_files and isinstance(untracked_files, list):
            arr += untracked_files

        if limit:
            arr = arr[:limit]

        files = {}
        for filename in arr:
            # filename: default_repo/transformers/load.py
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

            files[parts[0]] = obj_final

        return build_file_object(files)

    def logs(self, commits: int = None) -> List[Dict]:
        git_manager = self.get_git_manager(user=self.current_user)
        return git_manager.logs(commits=commits)

    def remotes(self, limit: int = None) -> List[Dict]:
        git_manager = self.get_git_manager(user=self.current_user)
        return git_manager.remotes(limit=limit, user=self.current_user)
