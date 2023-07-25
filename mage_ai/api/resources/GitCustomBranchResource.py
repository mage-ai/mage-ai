from mage_ai.api.resources.GitBranchResource import GitBranchResource
from mage_ai.data_preparation.git import Git


class GitCustomBranchResource(GitBranchResource):
    @classmethod
    def get_git_manager(self, user) -> Git:
        return Git.get_manager(setup_repo=False, user=user)
