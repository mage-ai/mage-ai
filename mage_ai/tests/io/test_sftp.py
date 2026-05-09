"""
Unit tests for mage_ai.io.sftp.SFTP

All paramiko I/O is mocked — no real SFTP server is needed.
"""
from io import BytesIO
from unittest import TestCase
from unittest.mock import MagicMock, patch

import pandas as pd

from mage_ai.io.config import ConfigKey
from mage_ai.io.sftp import SFTP


class SFTPConnectorTests(TestCase):

    def setUp(self):
        self.patcher = patch('mage_ai.io.sftp.paramiko')
        self.mock_paramiko = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()

    def _make_config(self, **overrides):
        defaults = {
            ConfigKey.SFTP_HOST: 'sftp.example.com',
            ConfigKey.SFTP_USERNAME: 'user',
            ConfigKey.SFTP_PASSWORD: 'pass',
            ConfigKey.SFTP_PKEY: None,
            ConfigKey.SFTP_PORT: 22,
        }
        defaults.update(overrides)
        cfg = MagicMock()
        cfg.__getitem__ = lambda self, key: defaults.get(key)
        return cfg

    # -- with_config --------------------------------------------------------

    def test_with_config_password_auth(self):
        sftp = SFTP.with_config(self._make_config())
        self.mock_paramiko.Transport.assert_called_once_with(('sftp.example.com', 22))
        self.mock_paramiko.Transport.return_value.connect.assert_called_once_with(
            username='user', password='pass', pkey=None,
        )
        sftp.close()

    def test_with_config_pkey_auth(self):
        cfg = self._make_config(**{ConfigKey.SFTP_PASSWORD: None, ConfigKey.SFTP_PKEY: '/key'})
        sftp = SFTP.with_config(cfg)
        self.mock_paramiko.RSAKey.from_private_key_file.assert_called_once_with('/key')
        sftp.close()

    def test_with_config_missing_host_raises(self):
        cfg = self._make_config(**{ConfigKey.SFTP_HOST: None})
        with self.assertRaises(ValueError):
            SFTP.with_config(cfg)

    # -- load ---------------------------------------------------------------

    @patch('mage_ai.io.sftp.SFTP._read')
    def test_load_csv(self, mock_read):
        csv_bytes = b'a,b\n1,2\n3,4\n'
        mock_client = MagicMock()
        self.mock_paramiko.SFTPClient.from_transport.return_value = mock_client
        mock_file = MagicMock()
        mock_client.open.return_value.__enter__.return_value = mock_file

        # Mock the underlying _read from BaseFile so we don't need actual pandas parsing
        mock_read.return_value = pd.DataFrame({'a': [1, 3], 'b': [2, 4]})

        sftp = SFTP.with_config(self._make_config())
        df = sftp.load('/data/test.csv')

        self.assertIsInstance(df, pd.DataFrame)
        self.assertEqual(list(df.columns), ['a', 'b'])
        self.assertEqual(len(df), 2)
        mock_read.assert_called_once()
        sftp.close()

    # -- export -------------------------------------------------------------

    @patch('mage_ai.io.sftp.SFTP._write')
    def test_export_dataframe(self, mock_write):
        mock_client = MagicMock()
        self.mock_paramiko.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(self._make_config())
        sftp.export(pd.DataFrame({'x': [1]}), '/out.csv')

        mock_client.open.assert_called_once_with('/out.csv', 'wb')
        mock_write.assert_called_once()
        sftp.close()

    def test_export_file_path(self):
        mock_client = MagicMock()
        self.mock_paramiko.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(self._make_config())
        sftp.export('/local.csv', '/remote.csv')
        mock_client.put.assert_called_once_with('/local.csv', '/remote.csv')
        sftp.close()

    def test_export_invalid_input_raises(self):
        self.mock_paramiko.SFTPClient.from_transport.return_value = MagicMock()
        sftp = SFTP.with_config(self._make_config())
        with self.assertRaises(ValueError):
            sftp.export(12345, '/remote.csv')
        sftp.close()

    # -- exists -------------------------------------------------------------

    def test_exists_true(self):
        mock_client = MagicMock()
        self.mock_paramiko.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(self._make_config())
        self.assertTrue(sftp.exists('/some/path'))
        mock_client.stat.assert_called_once_with('/some/path')
        sftp.close()

    def test_exists_false(self):
        mock_client = MagicMock()
        mock_client.stat.side_effect = FileNotFoundError
        self.mock_paramiko.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(self._make_config())
        self.assertFalse(sftp.exists('/missing'))
        sftp.close()

    # -- close / context manager --------------------------------------------

    def test_close(self):
        mock_client = MagicMock()
        mock_transport = MagicMock()
        self.mock_paramiko.SFTPClient.from_transport.return_value = mock_client
        self.mock_paramiko.Transport.return_value = mock_transport

        sftp = SFTP.with_config(self._make_config())
        sftp.close()
        mock_client.close.assert_called_once()
        mock_transport.close.assert_called_once()

    def test_context_manager(self):
        mock_client = MagicMock()
        mock_transport = MagicMock()
        self.mock_paramiko.SFTPClient.from_transport.return_value = mock_client
        self.mock_paramiko.Transport.return_value = mock_transport

        with SFTP.with_config(self._make_config()) as sftp:
            self.assertIsNotNone(sftp.client)
        mock_client.close.assert_called()
        mock_transport.close.assert_called()
