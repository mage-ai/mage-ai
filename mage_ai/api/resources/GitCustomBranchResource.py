from mage_ai.api.resources.GitBranchResource import GitBranchResource
from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.sync import AuthType


class GitCustomBranchResource(GitBranchResource):
    @classmethod
    def get_git_manager(self, user, setup_repo: bool = False) -> Git:
        return Git.get_manager(auth_type=AuthType.OAUTH, setup_repo=False, user=user)
