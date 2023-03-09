from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import Git


class GitBranchResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        git_manager = Git.get_manager()
        return self.build_result_set(
            [dict(name=branch) for branch in git_manager.all_branches()],
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        branch = payload.get('branch')
        git_manager = Git.get_manager()
        git_manager.change_branch(branch)

        return self(dict(name=git_manager.current_branch), user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        git_manager = Git.get_manager()
        return self(dict(name=git_manager.current_branch), user, **kwargs)

    def update(self, payload, **kwargs):
        git_manager = Git.get_manager()
        action_type = payload.get('action_type')
        if action_type == 'commit':
            message = payload.get('message')
            git_manager.commit(message)
        elif action_type == 'push':
            git_manager.push()
        elif action_type == 'pull':
            git_manager.pull()
        elif action_type == 'reset':
            git_manager.reset()

        return self