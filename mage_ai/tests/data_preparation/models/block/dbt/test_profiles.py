from pathlib import Path

import yaml

from mage_ai.data_preparation.models.block.dbt.profiles import Profiles
from mage_ai.tests.base_test import TestCase


class ProfilesTest(TestCase):
    """
    Tests the Profiles class, which is an interface with dbt profiles.yml files
    """
    @classmethod
    def setUpClass(self):
        super().setUpClass()

        self.variables = {
            'key2': 'value2',
            'key3': 'value3',
        }

        self.test_profiles_path = str(Path(self.repo_path) / 'profiles.yml')

        profiles_yaml = """# https://docs.getdbt.com/reference/profiles.yml
base:
  outputs:
    dev:
      key1: {{ variables('key1') }}
      key2: {{ variables('key2') }}
      key3: {{ variables('key3') }}
target: dev
"""
        with Path(self.test_profiles_path).open('w') as f:
            f.write(profiles_yaml)

        self.interpolated_profiles = {
            'base': {
                'outputs': {
                    'dev': {
                        'key1': 'None',
                        'key2': 'value2',
                        'key3': 'value3'
                    }
                }
            },
            'target': 'dev'
        }

    @classmethod
    def tearDownClass(self):
        Path(self.test_profiles_path).unlink()
        super().tearDownClass()

    def test_interpolate_clean(self):
        """
        Test the Profiles Interface by
        - writing a interpolated profiles.yml
        - checking the file contents
        - cleaning up the interpolated profiles.yml
        """
        with Profiles(self.repo_path, self.variables) as profiles:
            self.assertNotEquals(
                profiles.profiles_dir,
                self.repo_path
            )

            interpolated_profiles_full_path = Path(profiles.profiles_dir) / 'profiles.yml'
            with interpolated_profiles_full_path.open('r') as f:
                interpolated_profiles = yaml.safe_load(f.read())
            self.assertEqual(
                self.interpolated_profiles,
                interpolated_profiles
            )

            self.assertTrue(interpolated_profiles_full_path.exists())

            profiles.clean()

            self.assertFalse(interpolated_profiles_full_path.exists())

    def test_profiles(self):
        profiles = Profiles(self.repo_path, self.variables)
        self.assertEqual(
            self.interpolated_profiles,
            profiles.profiles
        )
