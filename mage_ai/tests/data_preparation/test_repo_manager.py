import os
import shutil
import uuid

import yaml

from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.settings.repo import MAGE_DATA_DIR_ENV_VAR
from mage_ai.tests.base_test import DBTestCase


class RepoManagerTest(DBTestCase):
    def test_variables_dir(self):
        if os.getenv(MAGE_DATA_DIR_ENV_VAR):
            del os.environ[MAGE_DATA_DIR_ENV_VAR]
        config_dict = dict(
            variables_dir='variables_dir_from_config_dict',
        )

        test1 = RepoConfig(repo_path=self.repo_path, config_dict=config_dict)
        self.assertEqual(
            test1.variables_dir,
            os.path.join(self.repo_path, 'variables_dir_from_config_dict'),
        )
        shutil.rmtree(test1.variables_dir)

        metadata_dict = dict(
            variables_dir='variables_dir_from_metadata',
        )
        test_repo_path = os.path.join(self.repo_path, 'repo_manager_test')
        os.makedirs(test_repo_path, exist_ok=True)
        with open(os.path.join(test_repo_path, 'metadata.yaml'), 'w') as f:
            yaml.dump(metadata_dict, f)
        test2 = RepoConfig(repo_path=test_repo_path)
        self.assertEqual(
            test2.variables_dir,
            os.path.join(test_repo_path, 'variables_dir_from_metadata'),
        )
        shutil.rmtree(test2.variables_dir)

        os.environ[MAGE_DATA_DIR_ENV_VAR] = 'variables_dir_from_env_var'
        test4 = RepoConfig(repo_path=self.repo_path)
        self.assertEqual(
            test4.variables_dir,
            os.path.join(self.repo_path, 'variables_dir_from_env_var'),
        )
        del os.environ[MAGE_DATA_DIR_ENV_VAR]
        shutil.rmtree(test4.variables_dir)

    def test_variables_dir_default(self):
        test = RepoConfig(repo_path=os.path.join(self.repo_path, 'non_existing_path'))
        self.assertEqual(
            test.variables_dir,
            os.path.join(self.repo_path, 'non_existing_path')
        )
        shutil.rmtree(test.variables_dir)

    def test_variables_dir_expanduser(self):
        dir_name = uuid.uuid4().hex
        metadata_dict = dict(
            variables_dir=f'~/{dir_name}',
        )
        test_repo_path = os.path.join(self.repo_path, 'repo_manager_test')
        os.makedirs(test_repo_path, exist_ok=True)
        with open(os.path.join(test_repo_path, 'metadata.yaml'), 'w') as f:
            yaml.dump(metadata_dict, f)
        test = RepoConfig(repo_path=test_repo_path)
        self.assertEqual(
            test.variables_dir,
            os.path.expanduser(os.path.join(f'~/{dir_name}', 'repo_manager_test'))
        )
        test_dir = os.path.expanduser(f'~/{dir_name}')
        shutil.rmtree(test_dir)
