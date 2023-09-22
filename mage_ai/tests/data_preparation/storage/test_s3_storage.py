from unittest.mock import MagicMock

from mage_ai.data_preparation.storage.s3_storage import S3Storage
from mage_ai.tests.base_test import TestCase


class TestS3Storage(TestCase):

    def setUp(self):
        # Create a mock for the s3.Client instance
        self.s3_client_mock = MagicMock()
        self.storage = S3Storage(bucket='your_bucket', dirpath='your_dirpath')
        self.storage.client = self.s3_client_mock

    def test_isdir(self):
        self.s3_client_mock.list_objects.return_value = [{'key': 'your_dirpath/'}]
        self.assertTrue(self.storage.isdir('your_dirpath/'))

    def test_listdir(self):
        self.s3_client_mock.listdir.return_value = ['dirpath/file1.txt', 'dirpath/file2.txt']
        result = self.storage.listdir('dirpath/')
        self.assertEqual(result, ['file1.txt', 'file2.txt'])

    def test_path_exists(self):
        self.s3_client_mock.list_objects.return_value = [{'key': 'your_dirpath/file.txt'}]
        self.assertTrue(self.storage.path_exists('your_dirpath/file.txt'))

    def test_remove(self):
        self.storage.remove('your_file_path')
        self.s3_client_mock.delete_objects.assert_called_with('your_file_path')

    def test_remove_dir(self):
        self.storage.remove_dir('your_dir_path')
        self.s3_client_mock.delete_objects.assert_called_with('your_dir_path')

    def test_open_to_write(self):
        with self.storage.open_to_write('test_dir/test_file') as f:
            f.write('test1\n')
            f.write('test2')

        self.s3_client_mock.upload.assert_called_with(
            'test_dir/test_file',
            'test1\ntest2'
        )
