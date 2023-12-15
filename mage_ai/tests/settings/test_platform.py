import os
from unittest.mock import patch

import yaml
from jinja2 import Template

from mage_ai.data_preparation.shared.utils import get_template_vars_no_db
from mage_ai.settings.platform import (
    activate_project,
    active_project_settings,
    build_active_project_repo_path,
    get_repo_paths_for_file_path,
    git_settings,
    local_platform_settings_full_path,
    platform_settings,
    platform_settings_full_path,
    project_platform_activated,
    project_platform_settings,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin

SETTINGS = dict(
    projects=dict(
        mage_platform=dict(
            database=dict(
                query=dict(
                    pipeline_schedules=[
                        'default_repo',
                        'default_repo/default_repo',
                    ],
                    secrets=[
                        'default_repo2',
                        'default_repo2/default_repo',
                    ],
                ),
            ),
            git=dict(
                path='mage_platform/git',
            ),
        ),
        mage_data=dict(
            git=dict(
                path='mage_data/dev',
            ),
            path='mage_data/platform',
        ),
    ),
)


@patch(
    'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
    lambda: True,
)
@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
class PlatformSettingsTest(ProjectPlatformMixin):
    def setUp(self):
        super().setUp()
        self.initialize_settings(SETTINGS)
        self.__get_settings()
        self.__get_settings_local()

    def __get_settings(self):
        with open(platform_settings_full_path()) as f:
            content = Template(f.read()).render(**get_template_vars_no_db())
            self.settings = yaml.full_load(content) or {}
            return self.settings

    def __get_settings_local(self):
        with open(local_platform_settings_full_path()) as f:
            content = Template(f.read()).render(**get_template_vars_no_db())
            self.settings_local = yaml.full_load(content) or {}
            return self.settings_local

    def test_activate_project(self):
        self.assertTrue(self.settings_local['projects']['mage_platform']['active'])
        activate_project('mage_data')

        self.__get_settings()
        self.__get_settings_local()

        self.assertFalse(self.settings_local['projects']['mage_platform']['active'])
        self.assertTrue(self.settings_local['projects']['mage_data']['active'])

    def test_get_repo_paths_for_file_path(self):
        self.assertEqual(
            get_repo_paths_for_file_path('mage_platform/data_loaders/load.py'),
            dict(
                full_path='/home/src/test/mage_platform',
                full_path_relative='test/mage_platform',
                path='mage_platform',
                root_project_full_path='/home/src/test',
                root_project_name='test',
                uuid='mage_platform',
            ),
        )

        self.assertEqual(
            get_repo_paths_for_file_path(
                'mage_data/platform/data_loaders/mage/fire/water/ice/load.py',
            ),
            dict(
                full_path='/home/src/test/mage_data/platform',
                full_path_relative='test/mage_data/platform',
                path='mage_data/platform',
                root_project_full_path='/home/src/test',
                root_project_name='test',
                uuid='mage_data',
            ),
        )

    def test_build_active_project_repo_path(self):
        self.assertEqual(build_active_project_repo_path(), '/home/src/test/mage_platform')
        activate_project('mage_data')
        self.assertEqual(build_active_project_repo_path(), '/home/src/test/mage_data/platform')

    def test_build_active_project_repo_path_no_active_projects(self):
        os.remove(local_platform_settings_full_path())
        self.assertFalse(os.path.exists(local_platform_settings_full_path()))
        self.assertEqual(build_active_project_repo_path(), '/home/src/test/mage_platform')

    def test_project_platform_activated(self):
        self.assertTrue(project_platform_activated())
        os.remove(platform_settings_full_path())
        self.assertFalse(project_platform_activated())

    def test_platform_settings(self):
        self.assertEqual(platform_settings(), dict(
            projects=dict(
                mage_platform=dict(
                    database=SETTINGS['projects']['mage_platform']['database'],
                    git=SETTINGS['projects']['mage_platform']['git'],
                ),
                mage_data=dict(
                    git=SETTINGS['projects']['mage_data']['git'],
                    path='mage_data/platform',
                ),
            ),
        ))

    def test_active_project_settings(self):
        self.assertEqual(active_project_settings(), dict(
            active=True,
            database=SETTINGS['projects']['mage_platform']['database'],
            git=SETTINGS['projects']['mage_platform']['git'],
            uuid='mage_platform',
        ))
        activate_project('mage_data')
        self.assertEqual(active_project_settings(), dict(
            active=True,
            git=SETTINGS['projects']['mage_data']['git'],
            path='mage_data/platform',
            uuid='mage_data',
        ))

    def test_project_platform_settings(self):
        self.assertEqual(project_platform_settings(), dict(
            mage_platform=dict(
                active=True,
                database=SETTINGS['projects']['mage_platform']['database'],
                git=SETTINGS['projects']['mage_platform']['git'],
            ),
            mage_data=dict(
                git=SETTINGS['projects']['mage_data']['git'],
                path='mage_data/platform',
            ),
        ))

    def test_git_settings(self):
        self.assertEqual(git_settings(), dict(
            path='/home/src/test/mage_platform/git',
        ))
        activate_project('mage_data')
        self.assertEqual(git_settings(), dict(
            path='/home/src/test/mage_data/dev',
        ))

    def test_platform_settings_full_path(self):
        self.assertEquals(platform_settings_full_path(), '/home/src/test/settings.yaml')

    def test_local_platform_settings_full_path(self):
        self.assertEquals(local_platform_settings_full_path(), '/home/src/test/.settings.yaml')
