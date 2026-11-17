import base64
import os
import stat
import tempfile
import unittest
from unittest.mock import patch

from mage_ai.data_preparation.git import utils
from mage_ai.data_preparation.sync import GitConfig


class CreateSSHKeysTest(unittest.TestCase):
    def test_created_private_key_permissions_are_restricted(self):
        private_key = 'private key'
        encoded_private_key = base64.b64encode(private_key.encode('utf-8')).decode('utf-8')

        with tempfile.TemporaryDirectory() as ssh_key_directory:
            git_config = GitConfig(
                remote_repo_link=None,
                ssh_private_key_secret_name='mage_git_ssh_private_key_b64',
                ssh_public_key_secret_name=None,
            )

            with patch.object(utils, 'DEFAULT_SSH_KEY_DIRECTORY', ssh_key_directory), \
                 patch.object(utils, 'get_secret_value', return_value=encoded_private_key), \
                 patch.object(utils, 'get_settings_value', return_value=None):
                private_key_file = utils.create_ssh_keys(
                    git_config,
                    repo_path='/tmp/repo',
                )

            with open(private_key_file) as f:
                self.assertEqual(private_key, f.read())
            self.assertEqual(
                0o600,
                stat.S_IMODE(os.stat(private_key_file).st_mode),
            )

    def test_existing_private_key_permissions_are_restricted(self):
        with tempfile.TemporaryDirectory() as ssh_key_directory:
            private_key_file = os.path.join(
                ssh_key_directory,
                'id_rsa_mage_git_ssh_private_key_b64',
            )
            with open(private_key_file, 'w') as f:
                f.write('private key')
            os.chmod(private_key_file, 0o660)

            git_config = GitConfig(
                remote_repo_link=None,
                ssh_private_key_secret_name='mage_git_ssh_private_key_b64',
                ssh_public_key_secret_name=None,
            )

            with patch.object(utils, 'DEFAULT_SSH_KEY_DIRECTORY', ssh_key_directory):
                returned_private_key_file = utils.create_ssh_keys(
                    git_config,
                    repo_path='/tmp/repo',
                )

            self.assertEqual(private_key_file, returned_private_key_file)
            self.assertEqual(
                0o600,
                stat.S_IMODE(os.stat(private_key_file).st_mode),
            )


if __name__ == '__main__':
    unittest.main()
