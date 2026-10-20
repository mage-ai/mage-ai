import os
import shutil

from mage_ai.settings.utils import base_repo_path

# from mage_ai.shared.files import find_directory
from mage_ai.shared.files import get_full_file_paths_containing_item
from mage_ai.tests.base_test import AsyncDBTestCase


class FilesTest(AsyncDBTestCase):
    def setUp(self):
        super().setUp()
        self.directory = os.path.join(base_repo_path(), 'test_files')

        os.makedirs(os.path.join(self.directory, 'dir1'), exist_ok=True)
        os.makedirs(os.path.join(self.directory, 'dir2'), exist_ok=True)
        os.makedirs(os.path.join(self.directory, 'dir2', 'dir3'), exist_ok=True)
        os.makedirs(os.path.join(self.directory, 'dir4'), exist_ok=True)

        with open(os.path.join(self.directory, 'dir1', 'file1.txt'), 'w') as f:
            f.write('file1')
        with open(os.path.join(self.directory, 'dir2', 'file2.txt'), 'w') as f:
            f.write('file2')
        with open(os.path.join(self.directory, 'dir2', 'dir3', 'file2_3.txt'), 'w') as f:
            f.write('file2_3')
        with open(os.path.join(self.directory, 'dir4', 'file4'), 'w') as f:
            f.write('file4')

    def tearDown(self):
        shutil.rmtree(self.directory)
        super().tearDown()

    # Fails on 3.8 in CI/CD for some reason
    # def test_find_directory(self):
    #     self.assertEqual(
    #         find_directory(self.directory, lambda fn: str(fn).endswith('.txt')),
    #         os.path.join(base_repo_path(), 'test_files/dir2/file2.txt'),
    #     )

    def test_get_full_file_paths_containing_item(self):
        self.assertEqual(sorted(get_full_file_paths_containing_item(
            self.directory,
            lambda fn: str(fn).endswith('.txt'),
        )), sorted([
            os.path.join(base_repo_path(), 'test_files/dir1/file1.txt'),
            os.path.join(base_repo_path(), 'test_files/dir2/dir3/file2_3.txt'),
            os.path.join(base_repo_path(), 'test_files/dir2/file2.txt'),
        ]))
