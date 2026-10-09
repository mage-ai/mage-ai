import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Mock the Azure SDK *before* importing the module under test.
# We force-set sys.modules so the mocks are used even when the real SDK is
# installed.  Original entries are saved and restored in tearDownModule().
# ---------------------------------------------------------------------------
_mock_azure = MagicMock()
_mock_azure_identity = MagicMock()
_mock_azure_keyvault = MagicMock()
_mock_azure_keyvault_secrets = MagicMock()

_AZURE_MODULE_NAMES = (
    'azure',
    'azure.identity',
    'azure.keyvault',
    'azure.keyvault.secrets',
)
_AZURE_MOCKS = (
    _mock_azure,
    _mock_azure_identity,
    _mock_azure_keyvault,
    _mock_azure_keyvault_secrets,
)

_SENTINEL = object()
_original_modules = {}
for _mod_name, _mock in zip(_AZURE_MODULE_NAMES, _AZURE_MOCKS):
    _original_modules[_mod_name] = sys.modules.get(_mod_name, _SENTINEL)
    sys.modules[_mod_name] = _mock

import mage_ai.services.azure.key_vault.key_vault as kv_module  # noqa: E402

MODULE = 'mage_ai.services.azure.key_vault.key_vault'
ENV_VAR = kv_module.ENV_VAR_KEY_VAULT_URL


def tearDownModule():
    """Restore original sys.modules entries to avoid leaking mocks."""
    for mod_name, original in _original_modules.items():
        if original is _SENTINEL:
            sys.modules.pop(mod_name, None)
        else:
            sys.modules[mod_name] = original


def _make_mock_secret(value):
    secret = MagicMock()
    secret.value = value
    return secret


# ===================================================================
# get_secret — public API
# ===================================================================
class TestGetSecret(unittest.TestCase):
    """Tests for the public get_secret() function."""

    def setUp(self):
        kv_module.clear_client_cache()

    @patch(f'{MODULE}._get_client')
    def test_uses_env_var_when_vault_url_omitted(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('env-val')
        mock_get_client.return_value = mock_client

        with patch.dict(os.environ, {ENV_VAR: 'https://env.vault.azure.net/'}, clear=False):
            result = kv_module.get_secret('MY_SECRET')

        self.assertEqual(result, 'env-val')
        mock_get_client.assert_called_once_with(
            'https://env.vault.azure.net/', None, None, None,
        )
        mock_client.get_secret.assert_called_once_with('MY_SECRET')

    @patch(f'{MODULE}._get_client')
    def test_explicit_vault_url(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('explicit-val')
        mock_get_client.return_value = mock_client

        result = kv_module.get_secret(
            'KEY', vault_url='https://explicit.vault.azure.net/',
        )

        self.assertEqual(result, 'explicit-val')
        mock_get_client.assert_called_once_with(
            'https://explicit.vault.azure.net/', None, None, None,
        )

    @patch(f'{MODULE}._get_client')
    def test_explicit_vault_url_overrides_env(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('override-val')
        mock_get_client.return_value = mock_client

        with patch.dict(os.environ, {ENV_VAR: 'https://env.vault.azure.net/'}, clear=False):
            result = kv_module.get_secret(
                'KEY', vault_url='https://override.vault.azure.net/',
            )

        self.assertEqual(result, 'override-val')
        mock_get_client.assert_called_once_with(
            'https://override.vault.azure.net/', None, None, None,
        )

    @patch(f'{MODULE}._get_client')
    def test_explicit_credentials(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('cred-val')
        mock_get_client.return_value = mock_client

        result = kv_module.get_secret(
            'DB_PASS',
            vault_url='https://v.vault.azure.net/',
            client_id='cid',
            client_secret='csec',
            tenant_id='tid',
        )

        self.assertEqual(result, 'cred-val')
        mock_get_client.assert_called_once_with(
            'https://v.vault.azure.net/', 'cid', 'csec', 'tid',
        )

    @patch(f'{MODULE}._get_client')
    def test_vault_url_is_stripped(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('v')
        mock_get_client.return_value = mock_client

        kv_module.get_secret('K', vault_url='  https://v.vault.azure.net/  ')

        mock_get_client.assert_called_once_with(
            'https://v.vault.azure.net/', None, None, None,
        )

    @patch(f'{MODULE}._get_client')
    def test_propagates_azure_sdk_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.side_effect = RuntimeError('SecretNotFound')
        mock_get_client.return_value = mock_client

        with self.assertRaises(RuntimeError) as ctx:
            kv_module.get_secret('MISSING', vault_url='https://v.vault.azure.net/')
        self.assertIn('SecretNotFound', str(ctx.exception))


# ===================================================================
# get_secret — validation / error handling
# ===================================================================
class TestGetSecretValidation(unittest.TestCase):
    """Tests for input validation in get_secret()."""

    def setUp(self):
        kv_module.clear_client_cache()

    def test_raises_when_no_vault_url_and_no_env(self):
        env_without_vault = {k: v for k, v in os.environ.items() if k != ENV_VAR}
        with patch.dict(os.environ, env_without_vault, clear=True):
            with self.assertRaises(ValueError) as ctx:
                kv_module.get_secret('ANY')
            self.assertIn('No Azure Key Vault URL provided', str(ctx.exception))

    def test_raises_on_empty_string_vault_url(self):
        with self.assertRaises(ValueError):
            kv_module.get_secret('ANY', vault_url='')

    def test_raises_on_whitespace_only_vault_url(self):
        with self.assertRaises(ValueError):
            kv_module.get_secret('ANY', vault_url='   ')

    def test_raises_on_empty_secret_name(self):
        with self.assertRaises(ValueError):
            kv_module.get_secret('', vault_url='https://v.vault.azure.net/')

    def test_raises_on_whitespace_only_secret_name(self):
        with self.assertRaises(ValueError):
            kv_module.get_secret('   ', vault_url='https://v.vault.azure.net/')

    def test_raises_on_partial_credentials_missing_secret(self):
        with self.assertRaises(ValueError) as ctx:
            kv_module.get_secret(
                'KEY',
                vault_url='https://v.vault.azure.net/',
                client_id='cid',
                tenant_id='tid',
            )
        self.assertIn('client_secret', str(ctx.exception))

    def test_raises_on_partial_credentials_missing_tenant(self):
        with self.assertRaises(ValueError) as ctx:
            kv_module.get_secret(
                'KEY',
                vault_url='https://v.vault.azure.net/',
                client_id='cid',
                client_secret='csec',
            )
        self.assertIn('tenant_id', str(ctx.exception))

    def test_raises_on_partial_credentials_missing_client_id(self):
        with self.assertRaises(ValueError) as ctx:
            kv_module.get_secret(
                'KEY',
                vault_url='https://v.vault.azure.net/',
                client_secret='csec',
                tenant_id='tid',
            )
        self.assertIn('client_id', str(ctx.exception))

    def test_raises_on_empty_string_env_vault_url(self):
        with patch.dict(os.environ, {ENV_VAR: ''}, clear=False):
            with self.assertRaises(ValueError):
                kv_module.get_secret('KEY')


# ===================================================================
# _get_client — client creation and caching
# ===================================================================
class TestGetClient(unittest.TestCase):
    """Tests for internal _get_client() caching and credential selection."""

    def setUp(self):
        kv_module.clear_client_cache()
        _mock_azure_keyvault_secrets.SecretClient.reset_mock()
        _mock_azure_identity.DefaultAzureCredential.reset_mock()
        _mock_azure_identity.ClientSecretCredential.reset_mock()
        _mock_azure_keyvault_secrets.SecretClient.side_effect = None

    def test_creates_client_with_default_credential(self):
        _mock_azure_keyvault_secrets.SecretClient.return_value = MagicMock()

        kv_module._get_client('https://v.vault.azure.net/')

        _mock_azure_identity.DefaultAzureCredential.assert_called_once()
        _mock_azure_identity.ClientSecretCredential.assert_not_called()
        _mock_azure_keyvault_secrets.SecretClient.assert_called_once()

    def test_creates_client_with_explicit_credential(self):
        _mock_azure_keyvault_secrets.SecretClient.return_value = MagicMock()

        kv_module._get_client(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='csec', tenant_id='tid',
        )

        _mock_azure_identity.ClientSecretCredential.assert_called_once_with(
            tenant_id='tid', client_id='cid', client_secret='csec',
        )
        _mock_azure_identity.DefaultAzureCredential.assert_not_called()

    def test_caches_client_per_vault_url(self):
        inst_a = MagicMock()
        inst_b = MagicMock()
        _mock_azure_keyvault_secrets.SecretClient.side_effect = [inst_a, inst_b]

        c1 = kv_module._get_client('https://a.vault.azure.net/')
        c2 = kv_module._get_client('https://a.vault.azure.net/')
        c3 = kv_module._get_client('https://b.vault.azure.net/')

        self.assertIs(c1, c2)
        self.assertIs(c1, inst_a)
        self.assertIs(c3, inst_b)
        self.assertEqual(_mock_azure_keyvault_secrets.SecretClient.call_count, 2)

    def test_different_creds_same_vault_creates_separate_clients(self):
        inst_default = MagicMock()
        inst_explicit = MagicMock()
        _mock_azure_keyvault_secrets.SecretClient.side_effect = [
            inst_default, inst_explicit,
        ]

        c1 = kv_module._get_client('https://v.vault.azure.net/')
        c2 = kv_module._get_client(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='csec', tenant_id='tid',
        )

        self.assertIsNot(c1, c2)
        self.assertIs(c1, inst_default)
        self.assertIs(c2, inst_explicit)

    def test_rotated_secret_creates_new_client(self):
        inst_old = MagicMock()
        inst_new = MagicMock()
        _mock_azure_keyvault_secrets.SecretClient.side_effect = [inst_old, inst_new]

        c1 = kv_module._get_client(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='old-secret', tenant_id='tid',
        )
        c2 = kv_module._get_client(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='new-secret', tenant_id='tid',
        )

        self.assertIsNot(c1, c2)
        self.assertIs(c1, inst_old)
        self.assertIs(c2, inst_new)
        self.assertEqual(_mock_azure_keyvault_secrets.SecretClient.call_count, 2)

    def test_clear_cache_removes_all_clients(self):
        _mock_azure_keyvault_secrets.SecretClient.return_value = MagicMock()

        kv_module._get_client('https://v.vault.azure.net/')
        self.assertEqual(len(kv_module._client_cache), 1)

        kv_module.clear_client_cache()
        self.assertEqual(len(kv_module._client_cache), 0)


# ===================================================================
# _build_cache_key
# ===================================================================
class TestBuildCacheKey(unittest.TestCase):
    def test_same_vault_produces_same_key(self):
        k1 = kv_module._build_cache_key('https://v.vault.azure.net/')
        k2 = kv_module._build_cache_key('https://v.vault.azure.net/')
        self.assertEqual(k1, k2)

    def test_different_vaults_produce_different_keys(self):
        k1 = kv_module._build_cache_key('https://a.vault.azure.net/')
        k2 = kv_module._build_cache_key('https://b.vault.azure.net/')
        self.assertNotEqual(k1, k2)

    def test_same_vault_different_creds_produce_different_keys(self):
        k1 = kv_module._build_cache_key('https://v.vault.azure.net/')
        k2 = kv_module._build_cache_key(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='csec', tenant_id='tid',
        )
        self.assertNotEqual(k1, k2)

    def test_none_creds_treated_as_empty(self):
        k1 = kv_module._build_cache_key('https://v.vault.azure.net/')
        k2 = kv_module._build_cache_key(
            'https://v.vault.azure.net/',
            client_id=None, client_secret=None, tenant_id=None,
        )
        self.assertEqual(k1, k2)

    def test_rotated_secret_produces_different_key(self):
        k1 = kv_module._build_cache_key(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='old-secret', tenant_id='tid',
        )
        k2 = kv_module._build_cache_key(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='new-secret', tenant_id='tid',
        )
        self.assertNotEqual(k1, k2)

    def test_secret_hash_is_not_raw_value(self):
        key = kv_module._build_cache_key(
            'https://v.vault.azure.net/',
            client_id='cid', client_secret='super-secret-value', tenant_id='tid',
        )
        self.assertNotIn('super-secret-value', key)


# ===================================================================
# _validate_credential_params
# ===================================================================
class TestValidateCredentialParams(unittest.TestCase):
    def test_all_none_is_valid(self):
        kv_module._validate_credential_params(None, None, None)

    def test_all_provided_is_valid(self):
        kv_module._validate_credential_params('cid', 'csec', 'tid')

    def test_missing_client_secret_raises(self):
        with self.assertRaises(ValueError) as ctx:
            kv_module._validate_credential_params('cid', None, 'tid')
        self.assertIn('client_secret', str(ctx.exception))

    def test_missing_tenant_id_raises(self):
        with self.assertRaises(ValueError) as ctx:
            kv_module._validate_credential_params('cid', 'csec', None)
        self.assertIn('tenant_id', str(ctx.exception))

    def test_missing_client_id_raises(self):
        with self.assertRaises(ValueError) as ctx:
            kv_module._validate_credential_params(None, 'csec', 'tid')
        self.assertIn('client_id', str(ctx.exception))

    def test_only_one_param_raises(self):
        with self.assertRaises(ValueError):
            kv_module._validate_credential_params('cid', None, None)


# ===================================================================
# _resolve_profile — profile-based credential resolution
# ===================================================================
class TestResolveProfile(unittest.TestCase):
    """Tests for named vault profile resolution from environment variables."""

    def test_resolves_full_profile(self):
        env = {
            'AZURE_KEY_VAULT_PROFILE_CUSTOMER1_URL': 'https://c1.vault.azure.net/',
            'AZURE_KEY_VAULT_PROFILE_CUSTOMER1_CLIENT_ID': 'cid1',
            'AZURE_KEY_VAULT_PROFILE_CUSTOMER1_CLIENT_SECRET': 'csec1',
            'AZURE_KEY_VAULT_PROFILE_CUSTOMER1_TENANT_ID': 'tid1',
        }
        with patch.dict(os.environ, env, clear=False):
            vault_url, cid, csec, tid = kv_module._resolve_profile('customer1')

        self.assertEqual(vault_url, 'https://c1.vault.azure.net/')
        self.assertEqual(cid, 'cid1')
        self.assertEqual(csec, 'csec1')
        self.assertEqual(tid, 'tid1')

    def test_resolves_url_only_profile(self):
        env = {
            'AZURE_KEY_VAULT_PROFILE_SIMPLE_URL': 'https://simple.vault.azure.net/',
        }
        with patch.dict(os.environ, env, clear=False):
            vault_url, cid, csec, tid = kv_module._resolve_profile('simple')

        self.assertEqual(vault_url, 'https://simple.vault.azure.net/')
        self.assertIsNone(cid)
        self.assertIsNone(csec)
        self.assertIsNone(tid)

    def test_profile_name_is_case_insensitive(self):
        env = {
            'AZURE_KEY_VAULT_PROFILE_MYPROFILE_URL': 'https://mp.vault.azure.net/',
        }
        with patch.dict(os.environ, env, clear=False):
            vault_url, _, _, _ = kv_module._resolve_profile('myprofile')
            self.assertEqual(vault_url, 'https://mp.vault.azure.net/')

            vault_url2, _, _, _ = kv_module._resolve_profile('MyProfile')
            self.assertEqual(vault_url2, 'https://mp.vault.azure.net/')

    def test_raises_when_profile_url_not_set(self):
        env_without_profile = {
            k: v for k, v in os.environ.items()
            if not k.startswith('AZURE_KEY_VAULT_PROFILE_MISSING')
        }
        with patch.dict(os.environ, env_without_profile, clear=True):
            with self.assertRaises(ValueError) as ctx:
                kv_module._resolve_profile('missing')
            self.assertIn('missing', str(ctx.exception))
            self.assertIn('AZURE_KEY_VAULT_PROFILE_MISSING_URL', str(ctx.exception))

    def test_raises_when_profile_url_is_empty(self):
        env = {'AZURE_KEY_VAULT_PROFILE_EMPTY_URL': ''}
        with patch.dict(os.environ, env, clear=False):
            with self.assertRaises(ValueError):
                kv_module._resolve_profile('empty')

    def test_raises_when_profile_url_is_whitespace(self):
        env = {'AZURE_KEY_VAULT_PROFILE_WS_URL': '   '}
        with patch.dict(os.environ, env, clear=False):
            with self.assertRaises(ValueError):
                kv_module._resolve_profile('ws')

    def test_vault_url_is_stripped(self):
        env = {
            'AZURE_KEY_VAULT_PROFILE_PADDED_URL': '  https://padded.vault.azure.net/  ',
        }
        with patch.dict(os.environ, env, clear=False):
            vault_url, _, _, _ = kv_module._resolve_profile('padded')
            self.assertEqual(vault_url, 'https://padded.vault.azure.net/')


# ===================================================================
# get_secret with profiles
# ===================================================================
class TestGetSecretWithProfile(unittest.TestCase):
    """Tests for get_secret() when using named profiles."""

    def setUp(self):
        kv_module.clear_client_cache()

    @patch(f'{MODULE}._get_client')
    def test_profile_resolves_all_credentials(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('profile-val')
        mock_get_client.return_value = mock_client

        env = {
            'AZURE_KEY_VAULT_PROFILE_CUST1_URL': 'https://cust1.vault.azure.net/',
            'AZURE_KEY_VAULT_PROFILE_CUST1_CLIENT_ID': 'cid1',
            'AZURE_KEY_VAULT_PROFILE_CUST1_CLIENT_SECRET': 'csec1',
            'AZURE_KEY_VAULT_PROFILE_CUST1_TENANT_ID': 'tid1',
        }
        with patch.dict(os.environ, env, clear=False):
            result = kv_module.get_secret('API_KEY', profile='cust1')

        self.assertEqual(result, 'profile-val')
        mock_get_client.assert_called_once_with(
            'https://cust1.vault.azure.net/', 'cid1', 'csec1', 'tid1',
        )

    @patch(f'{MODULE}._get_client')
    def test_profile_url_only_uses_default_credential(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('default-cred')
        mock_get_client.return_value = mock_client

        env = {
            'AZURE_KEY_VAULT_PROFILE_SIMPLE_URL': 'https://simple.vault.azure.net/',
        }
        with patch.dict(os.environ, env, clear=False):
            result = kv_module.get_secret('KEY', profile='simple')

        self.assertEqual(result, 'default-cred')
        mock_get_client.assert_called_once_with(
            'https://simple.vault.azure.net/', None, None, None,
        )

    @patch(f'{MODULE}._get_client')
    def test_explicit_params_override_profile(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.get_secret.return_value = _make_mock_secret('override-val')
        mock_get_client.return_value = mock_client

        env = {
            'AZURE_KEY_VAULT_PROFILE_BASE_URL': 'https://base.vault.azure.net/',
            'AZURE_KEY_VAULT_PROFILE_BASE_CLIENT_ID': 'base-cid',
            'AZURE_KEY_VAULT_PROFILE_BASE_CLIENT_SECRET': 'base-csec',
            'AZURE_KEY_VAULT_PROFILE_BASE_TENANT_ID': 'base-tid',
        }
        with patch.dict(os.environ, env, clear=False):
            kv_module.get_secret(
                'KEY',
                vault_url='https://override.vault.azure.net/',
                profile='base',
            )

        mock_get_client.assert_called_once_with(
            'https://override.vault.azure.net/', 'base-cid', 'base-csec', 'base-tid',
        )

    @patch(f'{MODULE}._get_client')
    def test_two_profiles_return_different_secrets(self, mock_get_client):
        results = {
            'https://cust1.vault.azure.net/': 'secret-from-cust1',
            'https://cust2.vault.azure.net/': 'secret-from-cust2',
        }

        def side_effect(vault_url, *args):
            client = MagicMock()
            client.get_secret.return_value = _make_mock_secret(results[vault_url])
            return client

        mock_get_client.side_effect = side_effect

        env = {
            'AZURE_KEY_VAULT_PROFILE_CUST1_URL': 'https://cust1.vault.azure.net/',
            'AZURE_KEY_VAULT_PROFILE_CUST2_URL': 'https://cust2.vault.azure.net/',
        }
        with patch.dict(os.environ, env, clear=False):
            r1 = kv_module.get_secret('API_KEY', profile='cust1')
            r2 = kv_module.get_secret('API_KEY', profile='cust2')

        self.assertEqual(r1, 'secret-from-cust1')
        self.assertEqual(r2, 'secret-from-cust2')

    def test_nonexistent_profile_raises(self):
        env_without_profile = {
            k: v for k, v in os.environ.items()
            if not k.startswith('AZURE_KEY_VAULT_PROFILE_NONEXISTENT')
        }
        with patch.dict(os.environ, env_without_profile, clear=True):
            with self.assertRaises(ValueError) as ctx:
                kv_module.get_secret('KEY', profile='nonexistent')
            self.assertIn('nonexistent', str(ctx.exception))


# ===================================================================
# Integration: multi-vault end-to-end with mocked SDK
# ===================================================================
class TestMultiVaultEndToEnd(unittest.TestCase):
    """Simulates the core use case: one pipeline, multiple customers,
    each with their own vault."""

    def setUp(self):
        kv_module.clear_client_cache()
        _mock_azure_keyvault_secrets.SecretClient.reset_mock()
        _mock_azure_identity.DefaultAzureCredential.reset_mock()

    def test_three_vaults_return_different_secrets(self):
        vault_data = {
            'https://default.vault.azure.net/': 'default-api-key',
            'https://customer1.vault.azure.net/': 'customer1-api-key',
            'https://customer2.vault.azure.net/': 'customer2-api-key',
        }

        def make_client(vault_url, credential):
            client = MagicMock()
            client.get_secret.side_effect = (
                lambda name: _make_mock_secret(vault_data[vault_url])
            )
            return client

        _mock_azure_keyvault_secrets.SecretClient.side_effect = make_client

        with patch.dict(os.environ, {ENV_VAR: 'https://default.vault.azure.net/'}, clear=False):
            r_default = kv_module.get_secret('API_KEY')
            r_cust1 = kv_module.get_secret(
                'API_KEY', vault_url='https://customer1.vault.azure.net/',
            )
            r_cust2 = kv_module.get_secret(
                'API_KEY', vault_url='https://customer2.vault.azure.net/',
            )

        self.assertEqual(r_default, 'default-api-key')
        self.assertEqual(r_cust1, 'customer1-api-key')
        self.assertEqual(r_cust2, 'customer2-api-key')
        self.assertEqual(len(kv_module._client_cache), 3)

    def test_repeated_calls_reuse_cached_client(self):
        call_count = {'n': 0}

        def counting_client(vault_url, credential):
            call_count['n'] += 1
            client = MagicMock()
            client.get_secret.return_value = _make_mock_secret('val')
            return client

        _mock_azure_keyvault_secrets.SecretClient.side_effect = counting_client

        for _ in range(5):
            kv_module.get_secret(
                'KEY', vault_url='https://v.vault.azure.net/',
            )

        self.assertEqual(call_count['n'], 1)

    def test_profiles_end_to_end(self):
        """Full E2E: two named profiles, different vaults, different secrets."""
        vault_data = {
            'https://acme.vault.azure.net/': 'acme-db-pass',
            'https://globex.vault.azure.net/': 'globex-db-pass',
        }

        def make_client(vault_url, credential):
            client = MagicMock()
            client.get_secret.side_effect = (
                lambda name: _make_mock_secret(vault_data[vault_url])
            )
            return client

        _mock_azure_keyvault_secrets.SecretClient.side_effect = make_client

        env = {
            'AZURE_KEY_VAULT_PROFILE_ACME_URL': 'https://acme.vault.azure.net/',
            'AZURE_KEY_VAULT_PROFILE_ACME_CLIENT_ID': 'acme-cid',
            'AZURE_KEY_VAULT_PROFILE_ACME_CLIENT_SECRET': 'acme-csec',
            'AZURE_KEY_VAULT_PROFILE_ACME_TENANT_ID': 'acme-tid',
            'AZURE_KEY_VAULT_PROFILE_GLOBEX_URL': 'https://globex.vault.azure.net/',
            'AZURE_KEY_VAULT_PROFILE_GLOBEX_CLIENT_ID': 'globex-cid',
            'AZURE_KEY_VAULT_PROFILE_GLOBEX_CLIENT_SECRET': 'globex-csec',
            'AZURE_KEY_VAULT_PROFILE_GLOBEX_TENANT_ID': 'globex-tid',
        }
        with patch.dict(os.environ, env, clear=False):
            r_acme = kv_module.get_secret('DB_PASS', profile='acme')
            r_globex = kv_module.get_secret('DB_PASS', profile='globex')

        self.assertEqual(r_acme, 'acme-db-pass')
        self.assertEqual(r_globex, 'globex-db-pass')
        self.assertEqual(len(kv_module._client_cache), 2)


# ===================================================================
# Template variable registration (Jinja integration)
# ===================================================================
class TestJinjaTemplateRegistration(unittest.TestCase):
    """Verify azure_secret_var is registered and callable via Jinja."""

    def test_azure_secret_var_in_template_vars(self):
        from mage_ai.data_preparation.shared.utils import get_template_vars_no_db
        template_vars = get_template_vars_no_db()
        self.assertIn('azure_secret_var', template_vars)
        self.assertIs(template_vars['azure_secret_var'], kv_module.get_secret)

    def test_jinja_render_with_default_vault(self):
        from jinja2 import Template
        from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

        kv_module.clear_client_cache()

        def mock_client(vault_url, credential):
            client = MagicMock()
            client.get_secret.return_value = _make_mock_secret('rendered-secret')
            return client

        _mock_azure_keyvault_secrets.SecretClient.side_effect = mock_client

        template_vars = get_template_vars_no_db()
        with patch.dict(os.environ, {ENV_VAR: 'https://v.vault.azure.net/'}, clear=False):
            rendered = Template(
                'key={{ azure_secret_var("MY_KEY") }}'
            ).render(**template_vars)

        self.assertEqual(rendered, 'key=rendered-secret')

    def test_jinja_render_with_explicit_vault_url(self):
        from jinja2 import Template
        from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

        kv_module.clear_client_cache()

        def mock_client(vault_url, credential):
            client = MagicMock()
            client.get_secret.return_value = _make_mock_secret(
                f'from-{vault_url}',
            )
            return client

        _mock_azure_keyvault_secrets.SecretClient.side_effect = mock_client

        template_vars = get_template_vars_no_db()
        rendered = Template(
            "key={{ azure_secret_var('K', "
            "vault_url='https://other.vault.azure.net/') }}"
        ).render(**template_vars)

        self.assertEqual(rendered, 'key=from-https://other.vault.azure.net/')

    def test_jinja_render_with_profile(self):
        from jinja2 import Template
        from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

        kv_module.clear_client_cache()

        def mock_client(vault_url, credential):
            client = MagicMock()
            client.get_secret.return_value = _make_mock_secret('profile-rendered')
            return client

        _mock_azure_keyvault_secrets.SecretClient.side_effect = mock_client

        env = {
            'AZURE_KEY_VAULT_PROFILE_DEMO_URL': 'https://demo.vault.azure.net/',
        }
        template_vars = get_template_vars_no_db()
        with patch.dict(os.environ, env, clear=False):
            rendered = Template(
                "val={{ azure_secret_var('S', profile='demo') }}"
            ).render(**template_vars)

        self.assertEqual(rendered, 'val=profile-rendered')
