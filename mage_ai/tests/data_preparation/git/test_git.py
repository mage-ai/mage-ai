from mage_ai.api.resources.SyncResource import (
    get_ssh_private_key_secret_name,
    get_ssh_public_key_secret_name,
)
from mage_ai.data_preparation.shared.secrets import create_secret
from mage_ai.data_preparation.sync import (
    AuthType,
    GitConfig,
)
from mage_ai.data_preparation.git import Git
from mage_ai.tests.base_test import DBTestCase
import os
import unittest

REPO_SECRET = 'MAGE_TEST_REPO'
USERNAME_SECRET = 'MAGE_TEST_USERNAME'
EMAIL_SECRET = 'MAGE_TEST_EMAIL'
SSH_PUBLIC_KEY_SECRET = 'MAGE_TEST_SSH_PUBLIC_KEY'
SSH_PRIVATE_KEY_SECRET = 'MAGE_TEST_SSH_PRIVATE_KEY'


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

        if os.getenv(SSH_PUBLIC_KEY_SECRET):
            pubk_secret_name = get_ssh_public_key_secret_name()
            create_secret(pubk_secret_name, os.getenv(SSH_PUBLIC_KEY_SECRET))
            payload['ssh_public_key_secret_name'] = pubk_secret_name

        if os.getenv(SSH_PRIVATE_KEY_SECRET):
            pk_secret_name = get_ssh_private_key_secret_name()
            create_secret(pk_secret_name, os.getenv(SSH_PRIVATE_KEY_SECRET))
            payload['ssh_public_key_secret_name'] = pk_secret_name

        self.git_config = GitConfig.load(config=payload)

    @unittest.skipif(os.getenv(REPO_SECRET) is None, 'Git repository not provided')
    def test_set_up_repo(self):
        git_manager = Git(self.git_config)

        try:
            git_manager.clone()
        except Exception:
            self.fail('Setting up Git manager failed!')

        git_folder_path = os.path.join(self.git_repo_path, '.git')
        self.assertTrue(os.path.exists(git_folder_path))
