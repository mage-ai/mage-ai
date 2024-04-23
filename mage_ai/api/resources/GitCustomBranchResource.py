from typing import Dict, List

from mage_ai.api.resources.GitBranchResource import GitBranchResource
from mage_ai.data_preparation.git import REMOTE_NAME, Git, api
from mage_ai.data_preparation.sync import AuthType


class GitCustomBranchResource(GitBranchResource):
    @classmethod
    def get_git_manager(
        self, user, setup_repo: bool = False, config_overwrite: Dict = None
    ) -> Git:
        return Git.get_manager(
            auth_type=AuthType.OAUTH,
            config_overwrite=config_overwrite,
            setup_repo=setup_repo,
            user=user,
        )

    @classmethod
    def create(cls, payload, user, **kwargs):
        branch = payload.get('name')
        remote = payload.get('remote')

        token, _, url, config_overwrite = cls.get_oauth_config(
            remote_name=remote,
            user=user,
        )

        git_manager = cls.get_git_manager(
            user=user, config_overwrite=config_overwrite
        )

        if remote:
            api.switch_branch(
                remote,
                url,
                branch,
                token,
                config_overwrite=config_overwrite,
                user=user,
            )
        else:
            git_manager.switch_branch(branch)

        return cls(dict(name=git_manager.current_branch), user, **kwargs)

    @classmethod
    async def member(self, pk, user, **kwargs):
        resource = await GitBranchResource.member(pk, user, **kwargs)
        model = resource.model
        model['access_token_exists'] = (
            self.get_git_manager(user=user).get_access_token() is not None
        )
        return self(model, user, **kwargs)

    def remotes(self, limit: int = None) -> List[Dict]:
        git_manager = self.get_git_manager(user=self.current_user)
        remotes = git_manager.remotes(limit=limit, user=self.current_user)
        # Filter out the remote used by git sync/git integration since it will not work
        # properly with the version control app.
        return list(filter(lambda remote: remote.get('name') != REMOTE_NAME, remotes))
