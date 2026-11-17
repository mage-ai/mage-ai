from unittest import mock

from pandas import DataFrame

from mage_ai.io.azure_blob_storage import AzureBlobStorage
from mage_ai.tests.base_test import TestCase


class AzureBlobStorageTests(TestCase):
    @mock.patch('mage_ai.io.azure_blob_storage.DefaultAzureCredential')
    @mock.patch('mage_ai.io.azure_blob_storage.BlobServiceClient')
    def test_export_forwards_top_level_overwrite_to_blob_upload(
        self,
        mock_blob_service_client,
        _mock_default_credential,
    ):
        blob_client = mock.Mock()
        mock_blob_service_client.return_value.get_blob_client.return_value = blob_client

        storage = AzureBlobStorage(storage_account_name='test-storage-account')
        storage.export(
            DataFrame({'value': [1]}),
            'test-container',
            'CSV/vehicles.csv',
            overwrite=True,
            index=False,
        )

        blob_client.upload_blob.assert_called_once()
        data, = blob_client.upload_blob.call_args.args
        self.assertEqual(b'value\n1\n', data)
        self.assertEqual({'overwrite': True}, blob_client.upload_blob.call_args.kwargs)

    @mock.patch('mage_ai.io.azure_blob_storage.DefaultAzureCredential')
    @mock.patch('mage_ai.io.azure_blob_storage.BlobServiceClient')
    def test_export_merges_overwrite_with_upload_kwargs(
        self,
        mock_blob_service_client,
        _mock_default_credential,
    ):
        blob_client = mock.Mock()
        mock_blob_service_client.return_value.get_blob_client.return_value = blob_client

        storage = AzureBlobStorage(storage_account_name='test-storage-account')
        upload_kwargs = {'content_settings': mock.sentinel.content_settings}

        storage.export(
            DataFrame({'value': [1]}),
            'test-container',
            'CSV/vehicles.csv',
            upload_kwargs=upload_kwargs,
            overwrite=True,
            index=False,
        )

        self.assertEqual(
            {
                'content_settings': mock.sentinel.content_settings,
                'overwrite': True,
            },
            blob_client.upload_blob.call_args.kwargs,
        )
        self.assertEqual({'content_settings': mock.sentinel.content_settings}, upload_kwargs)
