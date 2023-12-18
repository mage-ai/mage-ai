import os
from unittest.mock import patch

from mage_ai.data_preparation.models.block.platform.utils import (
    from_another_project,
    get_selected_directory_from_file_path,
)
from mage_ai.settings.utils import base_repo_path
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


@patch(
    'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
    lambda: True,
)
@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class BlockPlatformUtilsTest(ProjectPlatformMixin):
    def test_from_another_project(self):
        with patch(
            'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
            lambda: True,
        ):
            self.assertFalse(from_another_project(''))

        with patch(
            'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
            lambda: False,
        ):
            self.assertFalse(from_another_project('mage_data/fire.py'))

        with patch(
            'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
            lambda: True,
        ):
            self.assertTrue(from_another_project('mage_data/fire.py'))

        with patch(
            'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
            lambda: True,
        ):
            self.assertFalse(from_another_project('mage_platform/fire.py'))

    def test_get_selected_directory_from_file_path(self):
        os.makedirs(
            os.path.join(base_repo_path(), 'mage_platform/dbt/demo/models/team/group'),
            exist_ok=True,
        )
        with open(
            os.path.join(base_repo_path(), 'mage_platform/dbt/demo/models/team/group/fire.sql'),
            'w',
        ) as f:
            f.write('')
        with open(
            os.path.join(base_repo_path(), 'mage_platform/dbt/demo/dbt_project.yml'),
            'w',
        ) as f:
            f.write('')

        os.makedirs(
            os.path.join(base_repo_path(), 'mage_platform/dbt/demo2/models/team/group'),
            exist_ok=True,
        )
        with open(
            os.path.join(base_repo_path(), 'mage_platform/dbt/demo2/models/team/group/fire.sql'),
            'w',
        ) as f:
            f.write('')
        with open(
            os.path.join(base_repo_path(), 'mage_platform/dbt/demo2/dbt_project.yml'),
            'w',
        ) as f:
            f.write('')

        project_path = get_selected_directory_from_file_path(
            file_path='dbt/demo2/models/team/group/fire.sql',
            selector=lambda fn: (
                str(fn).endswith(os.path.join(os.sep, 'dbt_project.yml')) or
                str(fn).endswith(os.path.join(os.sep, 'dbt_project.yaml'))
            ),
        )

        self.assertEqual(os.path.join(base_repo_path(), 'mage_platform/dbt/demo2'), project_path)
