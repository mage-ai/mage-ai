from unittest import mock
from unittest.mock import MagicMock

from mage_ai.data_preparation.storage.gcs_storage import GCSStorage
from mage_ai.tests.base_test import TestCase


class mock_blob():

    def __init__(self, name):
        self.name = name

    def delete(self):
        pass


class TestGCSStorage(TestCase):

    @mock.patch('mage_ai.data_preparation.storage.gcs_storage.storage')
    def setUp(self, mock_storage):
        # Create a mock for the gcs.Client instance
        self.gcs_client_mock = mock_storage.Client.return_value
        self.gcs_bucket_mock = MagicMock()
        self.gcs_client_mock.bucket.return_value = self.gcs_bucket_mock

        self.storage = GCSStorage(dirpath='gs://your_dirpath')

    def test_isdir(self):
        self.gcs_bucket_mock.list_objects.return_value = [{'key': 'your_dirpath/'}]
        self.assertTrue(self.storage.isdir('your_dirpath/'))

    def test_listdir(self):
        path = 'dirpath'

        self.gcs_bucket_mock.list_blobs.return_value = [
            mock_blob(f'{path}/'),
            mock_blob(f'{path}/file1.txt'),
            mock_blob(f'{path}/file2.txt'),
            mock_blob(f'{path}/depth_0/'),
            mock_blob(f'{path}/depth_0/file3.txt'),
            mock_blob(f'{path}/depth_0/depth_1/'),
            mock_blob(f'{path}/depth_0/depth_1/file4.txt'),
        ]
        result = self.storage.listdir(path)
        self.assertEqual(result, ['file1.txt', 'file2.txt', 'depth_0'])

    def test_path_exists(self):
        self.gcs_bucket_mock.blob.exists = True
        self.assertTrue(self.storage.path_exists('your_dirpath/file.txt'))

    def test_remove(self):
        self.storage.remove('your_file_path')
        self.gcs_bucket_mock.delete_blob.assert_called_with('your_file_path')

    def test_remove_dir(self):
        self.storage.remove_dir('your_dir_path')
        self.gcs_bucket_mock.list_blobs.assert_called_with(prefix='your_dir_path')

    def test_open_to_write(self):
        with self.storage.open_to_write('test_dir/test_file') as f:
            f.write('test1\n')
            f.write('test2')

        self.gcs_bucket_mock.blob.assert_called_with('test_dir/test_file')
