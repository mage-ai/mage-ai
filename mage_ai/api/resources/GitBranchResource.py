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
        git_manager.change_branch(branch)

        return self(dict(name=git_manager.current_branch), user, **kwargs)

    @classmethod
    async def member(self, pk, user, **kwargs):
        branch = None
        if get_preferences(user=user).is_valid_git_config():
            git_manager = Git.get_manager(user=user)
            branch = git_manager.current_branch
        return self(dict(name=branch), user, **kwargs)

    async def update(self, payload, **kwargs):
        git_manager = Git.get_manager(user=self.current_user)
        action_type = payload.get('action_type')
        if action_type == 'status':
            status = git_manager.status()
            self.model = dict(name=git_manager.current_branch, status=status)
        elif action_type == 'commit':
            message = payload.get('message')
            if not message:
                error = ApiError.RESOURCE_ERROR
                error.update({
                    'message': 'Message is empty, please add a message for your commit.',
                })
                raise ApiError(error)
            git_manager.commit(message)
        elif action_type == 'push':
            git_manager.push()
        elif action_type == 'pull':
            git_manager.pull()
        elif action_type == 'reset':
            git_manager.reset()

        return self
