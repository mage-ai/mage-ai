import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import yaml

from mage_ai.data_preparation.models.block.dbt.profiles import (
    PROFILES_TEMP_DIR_ENV_VAR,
    Profiles,
)
from mage_ai.tests.base_test import AsyncDBTestCase


class ProfilesTest(AsyncDBTestCase):
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
        value = 'mage'

        file_path = os.path.join(
            self.repo_path,
            f'.mage_temp_profiles_{value}',
            'profiles.yml',
        )

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w') as f:
            f.write('')

        class MockUUID:
            def __str__(self):
                return value

            @property
            def hex(self) -> str:
                return value

        with patch(
            'mage_ai.data_preparation.models.block.dbt.profiles.uuid.uuid4',
            lambda: MockUUID(),
        ):
            with Profiles(self.repo_path, self.variables) as profiles:
                self.assertNotEqual(
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

    def test_interpolate_defaults_to_repo_path(self):
        with patch.dict(os.environ):
            os.environ.pop(PROFILES_TEMP_DIR_ENV_VAR, None)
            with Profiles(self.repo_path, self.variables) as profiles:
                self.assertEqual(
                    Path(profiles.profiles_dir).parent.resolve(),
                    Path(self.repo_path).resolve(),
                )

    def test_interpolate_in_profiles_temp_dir(self):
        with tempfile.TemporaryDirectory() as root_dir:
            temp_dir = os.path.join(root_dir, 'missing')
            with patch.dict(os.environ, {PROFILES_TEMP_DIR_ENV_VAR: temp_dir}):
                with Profiles(self.repo_path, self.variables) as profiles:
                    profiles_dir = Path(profiles.profiles_dir)
                    self.assertEqual(profiles_dir.parent.resolve(), Path(temp_dir).resolve())
                    self.assertEqual(profiles_dir.stat().st_mode & 0o777, 0o700)

                    with (profiles_dir / 'profiles.yml').open('r') as f:
                        self.assertEqual(self.interpolated_profiles, yaml.safe_load(f.read()))

                self.assertFalse(profiles_dir.exists())

    def test_profiles(self):
        profiles = Profiles(self.repo_path, self.variables)
        self.assertEqual(
            self.interpolated_profiles,
            profiles.profiles
        )
