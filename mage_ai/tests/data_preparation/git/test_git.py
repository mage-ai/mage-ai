from mage_ai.api.resources.SyncResource import (
    get_ssh_private_key_secret_name,
    get_ssh_public_key_secret_name,
)
from mage_ai.data_preparation.preferences import (
    get_preferences,
    Preferences,
)
from mage_ai.data_preparation.shared.secrets import create_secret
from mage_ai.data_preparation.sync import (
    AuthType,
    GitConfig,
)
from mage_ai.data_preparation.git import Git
from mage_ai.tests.base_test import DBTestCase
import asyncio
import os

REPO_SECRET = '89d7debf-a215-4419-ac73-4e8ab742ebb3'
USERNAME_SECRET = 'd7c81004-ddda-4a50-9dc9-aff3e2a71339'
EMAIL_SECRET = '42e49aec-8f9e-40b8-9779-17e1beb62d35'
SSH_PUBLIC_KEY_SECRET = 'e2dd9a4f-1255-4d35-ad1f-1aa1c89dfd05'
SSH_PRIVATE_KEY_SECRET = '6a93252e-527b-431b-9785-4dc950d2000f'


class GitTest(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()

        self.git_repo_path = os.path.join(self.repo_path, 'test_git')
        payload = dict(
            remote_repo_link=os.getenv(REPO_SECRET),
            repo_path=self.git_repo_path,
            username=os.getenv(USERNAME_SECRET),
            email=os.getenv(EMAIL_SECRET),
            auth_type=AuthType.SSH,
        )
        pubk_secret_name = get_ssh_public_key_secret_name()
        create_secret(pubk_secret_name, os.getenv(SSH_PUBLIC_KEY_SECRET))
        payload['ssh_public_key_secret_name'] = pubk_secret_name

        pk_secret_name = get_ssh_private_key_secret_name()
        create_secret(pk_secret_name, os.getenv(SSH_PRIVATE_KEY_SECRET))
        payload['ssh_public_key_secret_name'] = pk_secret_name

        self.git_config = GitConfig.load(config=payload)

    def test_set_up_repo(self):
        git_manager = Git(self.git_config)

        try:
            git_manager.clone()
        except Exception:
            self.fail('Setting up Git manager failed!')

        git_folder_path = os.path.join(self.git_repo_path, '.git')
        self.assertTrue(os.path.exists(git_folder_path))
