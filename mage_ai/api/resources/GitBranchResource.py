from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.preferences import get_preferences


class GitBranchResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        git_manager = Git.get_manager(user=user)
        return self.build_result_set(
            [dict(name=branch) for branch in git_manager.branches],
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        branch = payload.get('name')
        git_manager = Git.get_manager(user=user)
        git_manager.switch_branch(branch)

        return self(dict(name=git_manager.current_branch), user, **kwargs)

    @classmethod
    async def member(self, pk, user, **kwargs):
        branch = None
        preferences = get_preferences(user=user)
        if preferences.is_git_integration_enabled():
            git_manager = Git.get_manager(user=user)
            branch = git_manager.current_branch
        return self(dict(name=branch), user, **kwargs)

    async def update(self, payload, **kwargs):
        git_manager = Git.get_manager(user=self.current_user)
        action_type = payload.get('action_type')
        if action_type == 'status':
            status = git_manager.status()
            untracked_files = git_manager.untracked_files()
            modified_files = git_manager.modified_files
            self.model = dict(
                name=git_manager.current_branch,
                status=status,
                untracked_files=untracked_files,
                modified_files=modified_files,
            )
        elif action_type == 'commit':
            message = payload.get('message')
            files = payload.get('files', None)
            if not message:
                error = ApiError.RESOURCE_ERROR
                error.update({
                    'message': 'Message is empty, please add a message for your commit.',
                })
                raise ApiError(error)
            git_manager.commit(message, files)
        elif action_type == 'push':
            git_manager.push()
        elif action_type == 'pull':
            git_manager.pull()
        elif action_type == 'reset':
            git_manager.reset()
        elif action_type == 'clone':
            git_manager.clone()

        return self
