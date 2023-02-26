from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.sync.git_sync import GitSync
import os


class SyncResource(GenericResource):
    @classmethod
    def create(self, payload, user, **kwargs):
        type = payload.get('type')
        if type == 'git':
            remote_repo_link = payload.get('remote_repo_link')
            repo_path = payload.get('repo_path', os.getcwd())
            branch = payload.get('branch')
            sync = GitSync(
                remote_repo_link,
                repo_path=repo_path,
                branch=branch,
            )
            sync.sync_data()

        return self(dict(
            success=True
        ), user, **kwargs)
