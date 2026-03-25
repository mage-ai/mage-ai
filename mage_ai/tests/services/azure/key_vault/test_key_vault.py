import sys
import unittest
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Mock the Azure SDK *before* importing the module under test.
# We force-set sys.modules (not setdefault) so the mocks are used even
# when the real azure SDK happens to be installed in the environment.
# ---------------------------------------------------------------------------
_mock_azure = MagicMock()
_mock_azure_identity = MagicMock()
_mock_azure_keyvault = MagicMock()
_mock_azure_keyvault_secrets = MagicMock()

_original_modules = {}
for _mod_name, _mock in [
    ('azure', _mock_azure),
    ('azure.identity', _mock_azure_identity),
    ('azure.keyvault', _mock_azure_keyvault),
    ('azure.keyvault.secrets', _mock_azure_keyvault_secrets),
]:
    _original_modules[_mod_name] = sys.modules.get(_mod_name)
    sys.modules[_mod_name] = _mock

import mage_ai.services.azure.key_vault.key_vault as kv_module  # noqa: E402

MODULE = 'mage_ai.services.azure.key_vault.key_vault'
ENV_VAR = kv_module.ENV_VAR_KEY_VAULT_URL


def _make_mock_secret(value: str) -> MagicMock:
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

        with patch.dict('os.environ', {ENV_VAR: 'https://env.vault.azure.net/'}):
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

        with patch.dict('os.environ', {ENV_VAR: 'https://env.vault.azure.net/'}):
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
        with patch.dict('os.environ', {}, clear=False):
            os.environ.pop(ENV_VAR, None)
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
        with patch.dict('os.environ', {ENV_VAR: ''}):
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
            'https://v.vault.azure.net/', client_id='cid', tenant_id='tid',
        )
        self.assertNotEqual(k1, k2)

    def test_none_creds_treated_as_empty(self):
        k1 = kv_module._build_cache_key('https://v.vault.azure.net/')
        k2 = kv_module._build_cache_key(
            'https://v.vault.azure.net/', client_id=None, tenant_id=None,
        )
        self.assertEqual(k1, k2)


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

        with patch.dict('os.environ', {ENV_VAR: 'https://default.vault.azure.net/'}):
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
        with patch.dict('os.environ', {ENV_VAR: 'https://v.vault.azure.net/'}):
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


# ===================================================================
# Needed so patch.dict can reference os
# ===================================================================
import os  # noqa: E402
