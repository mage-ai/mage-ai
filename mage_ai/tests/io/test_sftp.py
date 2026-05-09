"""
Unit tests for mage_ai.io.sftp.SFTP

All paramiko I/O is mocked — no real SFTP server is needed.

We avoid the deep mage_ai import chain by running the test as a
standalone script that constructs the SFTP class from scratch using
only the code in sftp.py and base.py, with stub dependencies.
"""
import importlib
import os
import sys
from io import BytesIO
from types import ModuleType
from unittest import TestCase
from unittest.mock import MagicMock

import pandas as pd

# ── Root paths ──────────────────────────────────────────────────────
_REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))

_IO_DIR = os.path.join(_REPO, 'mage_ai', 'io')


# ── Stub factory ────────────────────────────────────────────────────
def _mod(name, path=None, attrs=None):
    m = ModuleType(name)
    m.__path__ = [path] if path else []
    m.__file__ = ''
    if attrs:
        for k, v in attrs.items():
            setattr(m, k, v)
    return m


# ── Build minimal stubs ────────────────────────────────────────────

class _StrEnum(str):
    pass


class _BaseEnum:
    pass


_stubs = {}


def _seed(name, mod):
    _stubs[name] = mod
    sys.modules[name] = mod


# mage_ai package root
_seed('mage_ai', _mod('mage_ai', os.path.join(_REPO, 'mage_ai')))

# mage_ai.shared.*
_seed('mage_ai.shared', _mod('mage_ai.shared'))
_seed('mage_ai.shared.enum', _mod('mage_ai.shared.enum', attrs={'StrEnum': _StrEnum}))

_printer_instance = MagicMock()
_VPH = MagicMock(return_value=_printer_instance)
_seed('mage_ai.shared.logger', _mod('mage_ai.shared.logger', attrs={
    'VerbosePrintHandler': _VPH,
}))
_seed('mage_ai.shared.models', _mod('mage_ai.shared.models', attrs={'BaseEnum': _BaseEnum}))
_seed('mage_ai.shared.utils', _mod('mage_ai.shared.utils', attrs={
    'clean_name': lambda n, **kw: n,
}))

# mage_ai.io.constants
_seed('mage_ai.io', _mod('mage_ai.io', _IO_DIR))
_seed('mage_ai.io.constants', _mod('mage_ai.io.constants', attrs={
    'SQL_RESERVED_WORDS': set(),
}))

# mage_ai.io.config — build real-ish ConfigKey
class ConfigKey(_StrEnum):
    SFTP_HOST = 'SFTP_HOST'
    SFTP_USERNAME = 'SFTP_USERNAME'
    SFTP_PASSWORD = 'SFTP_PASSWORD'
    SFTP_PKEY = 'SFTP_PKEY'
    SFTP_PORT = 'SFTP_PORT'


class BaseConfigLoader:
    pass


_seed('mage_ai.io.config', _mod('mage_ai.io.config', attrs={
    'ConfigKey': ConfigKey,
    'BaseConfigLoader': BaseConfigLoader,
    'ConfigFileLoader': MagicMock,
}))

# ── Now import the real modules under test ──────────────────────────
# base.py depends only on the stubs above
_base_spec = importlib.util.spec_from_file_location(
    'mage_ai.io.base', os.path.join(_IO_DIR, 'base.py'))
_base_mod = importlib.util.module_from_spec(_base_spec)
sys.modules['mage_ai.io.base'] = _base_mod
_base_spec.loader.exec_module(_base_mod)

# sftp.py depends on base + config + paramiko
_sftp_spec = importlib.util.spec_from_file_location(
    'mage_ai.io.sftp', os.path.join(_IO_DIR, 'sftp.py'))
sftp_mod = importlib.util.module_from_spec(_sftp_spec)
sys.modules['mage_ai.io.sftp'] = sftp_mod
_sftp_spec.loader.exec_module(sftp_mod)

SFTP = sftp_mod.SFTP


# ── Helpers ─────────────────────────────────────────────────────────

def _make_config(**overrides):
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


# ── Tests ───────────────────────────────────────────────────────────

class SFTPConnectorTests(TestCase):

    def _mock_paramiko(self):
        mp = MagicMock()
        sftp_mod.paramiko = mp
        return mp

    # -- with_config --------------------------------------------------------

    def test_with_config_password_auth(self):
        mp = self._mock_paramiko()
        sftp = SFTP.with_config(_make_config())
        mp.Transport.assert_called_once_with(('sftp.example.com', 22))
        mp.Transport.return_value.connect.assert_called_once_with(
            username='user', password='pass', pkey=None,
        )
        sftp.close()

    def test_with_config_pkey_auth(self):
        mp = self._mock_paramiko()
        cfg = _make_config(**{ConfigKey.SFTP_PASSWORD: None, ConfigKey.SFTP_PKEY: '/key'})
        sftp = SFTP.with_config(cfg)
        mp.RSAKey.from_private_key_file.assert_called_once_with('/key')
        sftp.close()

    def test_with_config_missing_host_raises(self):
        self._mock_paramiko()
        cfg = _make_config(**{ConfigKey.SFTP_HOST: None})
        with self.assertRaises(ValueError):
            SFTP.with_config(cfg)

    # -- load ---------------------------------------------------------------

    def test_load_csv(self):
        mp = self._mock_paramiko()
        csv_bytes = b'a,b\n1,2\n3,4\n'
        mock_client = MagicMock()
        mp.SFTPClient.from_transport.return_value = mock_client
        mock_client.getfo.side_effect = lambda r, buf: buf.write(csv_bytes)

        sftp = SFTP.with_config(_make_config())
        df = sftp.load('/data/test.csv')

        self.assertIsInstance(df, pd.DataFrame)
        self.assertEqual(list(df.columns), ['a', 'b'])
        self.assertEqual(len(df), 2)
        sftp.close()

    # -- export -------------------------------------------------------------

    def test_export_dataframe(self):
        mp = self._mock_paramiko()
        mock_client = MagicMock()
        mp.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(_make_config())
        sftp.export(pd.DataFrame({'x': [1]}), '/out.csv')

        mock_client.putfo.assert_called_once()
        self.assertIsInstance(mock_client.putfo.call_args[0][0], BytesIO)
        sftp.close()

    def test_export_file_path(self):
        mp = self._mock_paramiko()
        mock_client = MagicMock()
        mp.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(_make_config())
        sftp.export('/local.csv', '/remote.csv')
        mock_client.put.assert_called_once_with('/local.csv', '/remote.csv')
        sftp.close()

    def test_export_invalid_input_raises(self):
        mp = self._mock_paramiko()
        mp.SFTPClient.from_transport.return_value = MagicMock()
        sftp = SFTP.with_config(_make_config())
        with self.assertRaises(ValueError):
            sftp.export(12345, '/remote.csv')
        sftp.close()

    # -- exists -------------------------------------------------------------

    def test_exists_true(self):
        mp = self._mock_paramiko()
        mock_client = MagicMock()
        mp.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(_make_config())
        self.assertTrue(sftp.exists('/some/path'))
        mock_client.stat.assert_called_once_with('/some/path')
        sftp.close()

    def test_exists_false(self):
        mp = self._mock_paramiko()
        mock_client = MagicMock()
        mock_client.stat.side_effect = FileNotFoundError
        mp.SFTPClient.from_transport.return_value = mock_client

        sftp = SFTP.with_config(_make_config())
        self.assertFalse(sftp.exists('/missing'))
        sftp.close()

    # -- close / context manager --------------------------------------------

    def test_close(self):
        mp = self._mock_paramiko()
        mock_client = MagicMock()
        mock_transport = MagicMock()
        mp.SFTPClient.from_transport.return_value = mock_client
        mp.Transport.return_value = mock_transport

        sftp = SFTP.with_config(_make_config())
        sftp.close()
        mock_client.close.assert_called_once()
        mock_transport.close.assert_called_once()

    def test_context_manager(self):
        mp = self._mock_paramiko()
        mock_client = MagicMock()
        mock_transport = MagicMock()
        mp.SFTPClient.from_transport.return_value = mock_client
        mp.Transport.return_value = mock_transport

        with SFTP.with_config(_make_config()) as sftp:
            self.assertIsNotNone(sftp.client)
        mock_client.close.assert_called()
        mock_transport.close.assert_called()
