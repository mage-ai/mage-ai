import unittest

from google.cloud.storage import Blob, Client

from mage_integrations.connections.google_cloud_storage import GoogleCloudStorage


class GoogleCloudStorageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.credentials_file = 'path/to/credentials.json'

        cls.connection = GoogleCloudStorage(
            path_to_credentials_json_file=cls.credentials_file
        )

    def test_0_check_connection(self):
        client = self.connection.build_connection()
        self.assertIsInstance(client, Client)

    def test_1_list_blobs(self):
        client = self.connection.build_connection()
        blobs = client.list_blobs('my_bucket')
        for blob in blobs:
            self.assertIsInstance(blob, Blob)


if __name__ == '__main__':
    unittest.main()
