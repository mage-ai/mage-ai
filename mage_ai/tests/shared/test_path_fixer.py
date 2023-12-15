from unittest.mock import patch

from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class PathFixerTest(DBTestCase):
    def test_add_root_repo_path_to_relative_path(self):
        from mage_ai.shared.path_fixer import add_root_repo_path_to_relative_path

        self.assertEqual(add_root_repo_path_to_relative_path('fire'), '/home/src/test/fire')
        self.assertEqual(
            add_root_repo_path_to_relative_path('/home/src/test/fire'),
            '/home/src/test/fire',
        )

    def test_convert_absolute_path_to_relative(self):
        from mage_ai.shared.path_fixer import convert_absolute_path_to_relative

        self.assertEqual(convert_absolute_path_to_relative('/home/src/test'), 'home/src/test')

    def test_convert_relative_path_to_absolute(self):
        from mage_ai.shared.path_fixer import convert_relative_path_to_absolute

        self.assertEqual(convert_relative_path_to_absolute('home/src/test'), '/home/src/test')

    def test_remove_base_repo_path(self):
        from mage_ai.shared.path_fixer import remove_base_repo_path

        self.assertEqual(remove_base_repo_path('/home/src/test/demo'), 'demo')

    def test_remove_base_repo_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_name

        self.assertEqual(remove_base_repo_name('test/demo'), 'demo')

    def test_remove_base_repo_directory_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_directory_name

        self.assertEqual(remove_base_repo_directory_name('/home/src/test/demo'), 'test/demo')

    def test_remove_repo_names(self):
        from mage_ai.shared.path_fixer import remove_repo_names

        self.assertEqual(remove_repo_names('test/demo/mage'), 'demo/mage')


@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
class PathFixerProjectPlatformTest(ProjectPlatformMixin):
    def test_add_root_repo_path_to_relative_path(self):
        from mage_ai.shared.path_fixer import add_root_repo_path_to_relative_path

        self.assertEqual(add_root_repo_path_to_relative_path('fire'), '/home/src/test/fire')
        self.assertEqual(
            add_root_repo_path_to_relative_path('/home/src/test/fire'),
            '/home/src/test/fire',
        )

    def test_remove_base_repo_path(self):
        from mage_ai.shared.path_fixer import remove_base_repo_path

        self.assertEqual(remove_base_repo_path('/home/src/test/demo'), 'demo')

    def test_remove_base_repo_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_name

        self.assertEqual(remove_base_repo_name('test/demo'), 'demo')

    def test_remove_base_repo_directory_name(self):
        from mage_ai.shared.path_fixer import remove_base_repo_directory_name

        self.assertEqual(remove_base_repo_directory_name('/home/src/test/demo'), 'test/demo')

    def test_remove_repo_names(self):
        from mage_ai.shared.path_fixer import remove_repo_names

        self.assertEqual(remove_repo_names('test/mage_platform/demo/mage'), 'demo/mage')

    def test_get_path_parts(self):
        from mage_ai.shared.path_fixer import get_path_parts

        self.assertEqual(get_path_parts('mage_platform/demo/mage'), (
            '/home/src/test',
            'mage_platform',
            'demo/mage',
        ))
