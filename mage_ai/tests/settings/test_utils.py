from mage_ai.settings.utils import base_repo_dirname, base_repo_name, base_repo_path
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class SettingsUtilsTest(ProjectPlatformMixin):
    def test_base_repo_dirname(self):
        self.assertEqual(base_repo_dirname(), '/home/src')

    def test_base_repo_name(self):
        self.assertEqual(base_repo_name(), 'test')

    def test_base_repo_path(self):
        self.assertEqual(base_repo_path(), '/home/src/test')
