import os
from unittest.mock import patch

from mage_ai.settings.utils import base_repo_path
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class PathFixerTest(DBTestCase):
    def test_add_root_repo_path_to_relative_path(self):
        from mage_ai.shared.path_fixer import add_root_repo_path_to_relative_path

        self.assertEqual(
            add_root_repo_path_to_relative_path('fire'), os.path.join(base_repo_path(), 'fire'),
        )
        self.assertEqual(
            add_root_repo_path_to_relative_path(os.path.join(base_repo_path(), 'fire')),
            os.path.join(base_repo_path(), 'fire'),
        )

    def test_convert_absolute_path_to_relative(self):
        from mage_ai.shared.path_fixer import convert_absolute_path_to_relative

        self.assertEqual(convert_absolute_path_to_relative(base_repo_path()), base_repo_path()[1:])

    def test_convert_relative_path_to_absolute(self):
        from mage_ai.shared.path_fixer import convert_relative_path_to_absolute

        self.assertEqual(convert_relative_path_to_absolute(base_repo_path()[1:]), base_repo_path())

    def test_remove_base_repo_path(self):
        from mage_ai.shared.path_fixer import remove_base_repo_path

        self.assertEqual(remove_base_repo_path(os.path.join(base_repo_path(), 'demo')), 'demo')

    def test_remove_base_repo_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_name

        self.assertEqual(remove_base_repo_name('test/demo'), 'demo')

    def test_remove_base_repo_directory_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_directory_name

        self.assertEqual(
            remove_base_repo_directory_name(os.path.join(base_repo_path(), 'demo')), 'test/demo',
        )

    def test_remove_repo_names(self):
        from mage_ai.shared.path_fixer import remove_repo_names

        self.assertEqual(remove_repo_names('test/demo/mage'), 'demo/mage')


@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class PathFixerProjectPlatformTest(ProjectPlatformMixin):
    def test_add_root_repo_path_to_relative_path(self):
        from mage_ai.shared.path_fixer import add_root_repo_path_to_relative_path

        self.assertEqual(
            add_root_repo_path_to_relative_path('fire'), os.path.join(base_repo_path(), 'fire'),
        )
        self.assertEqual(
            add_root_repo_path_to_relative_path(os.path.join(base_repo_path(), 'fire')),
            os.path.join(base_repo_path(), 'fire'),
        )

    def test_remove_base_repo_path(self):
        from mage_ai.shared.path_fixer import remove_base_repo_path

        self.assertEqual(remove_base_repo_path(os.path.join(base_repo_path(), 'demo')), 'demo')

    def test_remove_base_repo_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_name

        self.assertEqual(remove_base_repo_name('test/demo'), 'demo')

    def test_remove_base_repo_directory_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_directory_name

        self.assertEqual(
            remove_base_repo_directory_name(os.path.join(base_repo_path(), 'demo')), 'test/demo',
        )

    def test_remove_repo_names(self):
        from mage_ai.shared.path_fixer import remove_repo_names

        self.assertEqual(remove_repo_names('test/mage_platform/demo/mage'), 'demo/mage')

    def test_get_path_parts(self):
        from mage_ai.shared.path_fixer import get_path_parts

        self.assertEqual(get_path_parts('mage_platform/demo/mage'), (
            base_repo_path(),
            'mage_platform',
            'demo/mage',
        ))
