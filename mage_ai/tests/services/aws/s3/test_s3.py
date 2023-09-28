from mage_ai.services.aws.s3.s3 import Client
from mage_ai.tests.base_test import TestCase
from unittest.mock import MagicMock, patch


class ClientTests(TestCase):
    @patch('mage_ai.services.aws.s3.s3.boto3')
    @patch('mage_ai.services.aws.s3.s3.botocore')
    @patch('mage_ai.services.aws.s3.s3.s3transfer')
    def test_listdir(self, mock_s3transfer, mock_botocore, mock_boto3):
        mock_client = MagicMock()
        mock_client.list_objects_v2 = MagicMock(return_value={
            'Contents': [
                {'Key': 'test_prefix/file1'},
                {'Key': 'test_prefix/file2.csv'},
                {'Key': 'test_prefix/file3.parquet'},
                {'Key': 'test_prefix/file4.csv'},
            ],
            'CommonPrefixes': [{'Prefix': 'test_prefix/test_folder/'}],
        })
        s3_client = Client('test_bucket', client=mock_client)

        results = s3_client.listdir('test_prefix', suffix='.csv')
        mock_client.list_objects_v2.assert_called_once_with(
            Bucket='test_bucket',
            MaxKeys=10000,
            Prefix='test_prefix',
            Delimiter='/',
        )
        self.assertEqual(results, [
            'test_prefix/file2.csv',
            'test_prefix/file4.csv',
            'test_prefix/test_folder/'
        ])

    @patch('mage_ai.services.aws.s3.s3.boto3')
    @patch('mage_ai.services.aws.s3.s3.botocore')
    @patch('mage_ai.services.aws.s3.s3.s3transfer')
    def test_list_objects(self, mock_s3transfer, mock_botocore, mock_boto3):
        mock_client = MagicMock()
        mock_client.list_objects_v2 = MagicMock(return_value={
            'Contents': [
                {'Key': 'test_prefix/file1'},
                {'Key': 'test_prefix/file2.csv'},
                {'Key': 'test_prefix/file3.parquet'},
                {'Key': 'test_prefix/test_folder/file4.csv'},
            ],
        })
        s3_client = Client('test_bucket', client=mock_client)

        results = s3_client.list_objects('test_prefix', suffix='.csv')
        mock_client.list_objects_v2.assert_called_once_with(
            Bucket='test_bucket',
            MaxKeys=10000,
            Prefix='test_prefix',
        )
        self.assertEqual(results, [
            'test_prefix/file2.csv',
            'test_prefix/test_folder/file4.csv',
        ])
