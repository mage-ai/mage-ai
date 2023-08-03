import os
import shutil

import yaml

from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.settings.repo import MAGE_DATA_DIR_ENV_VAR
from mage_ai.tests.base_test import DBTestCase


class RepoManagerTest(DBTestCase):
    def test_variables_dir_from_config_dict(self):
        config_dict = dict(
            variables_dir='variables_dir_from_config_dict',
        )

        test1 = RepoConfig(config_dict=config_dict)
        self.assertEqual(
            test1.variables_dir,
            os.path.join(self.repo_path, 'variables_dir_from_config_dict'),
        )
        shutil.rmtree(test1.variables_dir)

    def test_variables_dir_from_project_metadata(self):
        metadata_dict = dict(
            variables_dir='variables_dir_from_metadata',
        )
        with open(os.path.join(self.repo_path, 'metadata.yaml'), 'w') as f:
            yaml.dump(metadata_dict, f)
        test2 = RepoConfig(config_dict=dict())
        self.assertEqual(
            test2.variables_dir,
            os.path.join(self.repo_path, 'variables_dir_from_metadata'),
        )
        shutil.rmtree(test2.variables_dir)

    def test_variables_dir_from_default(self):
        test3 = RepoConfig(repo_path='non_existing_path')
        self.assertEqual(
            test3.variables_dir,
            os.path.join(os.getcwd(), 'non_existing_path')
        )
        shutil.rmtree(test3.variables_dir)

    def test_variables_dir_from_env_var(self):
        os.environ[MAGE_DATA_DIR_ENV_VAR] = 'variables_dir_from_env_var'
        test4 = RepoConfig()
        self.assertEqual(
            test4.variables_dir,
            os.path.join(self.repo_path, 'variables_dir_from_env_var'),
        )
        del os.environ[MAGE_DATA_DIR_ENV_VAR]
        shutil.rmtree(test4.variables_dir)
