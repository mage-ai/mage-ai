import hashlib
import logging
import os
import threading
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

ENV_VAR_KEY_VAULT_URL = 'AZURE_KEY_VAULT_URL'

_PROFILE_PREFIX = 'AZURE_KEY_VAULT_PROFILE_'

_client_cache: Dict[str, object] = {}
_cache_lock = threading.Lock()

_CREDENTIAL_PARAMS = ('client_id', 'client_secret', 'tenant_id')


def _build_cache_key(
    vault_url: str,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    tenant_id: Optional[str] = None,
) -> str:
    secret_hash = ''
    if client_secret:
        secret_hash = hashlib.sha256(client_secret.encode()).hexdigest()[:16]
    return f"{vault_url}|{client_id or ''}|{tenant_id or ''}|{secret_hash}"


def _resolve_profile(profile: str) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
    """Resolve a named vault profile from environment variables.

    Looks for env vars with the pattern:
        AZURE_KEY_VAULT_PROFILE_<NAME>_URL
        AZURE_KEY_VAULT_PROFILE_<NAME>_CLIENT_ID
        AZURE_KEY_VAULT_PROFILE_<NAME>_CLIENT_SECRET
        AZURE_KEY_VAULT_PROFILE_<NAME>_TENANT_ID

    Returns (vault_url, client_id, client_secret, tenant_id).
    """
    prefix = f'{_PROFILE_PREFIX}{profile.upper()}_'

    vault_url = os.getenv(f'{prefix}URL')
    if not vault_url or not vault_url.strip():
        raise ValueError(
            f'Vault profile {profile!r} not configured. '
            f'Set the {prefix}URL environment variable.'
        )

    client_id = os.getenv(f'{prefix}CLIENT_ID')
    client_secret = os.getenv(f'{prefix}CLIENT_SECRET')
    tenant_id = os.getenv(f'{prefix}TENANT_ID')

    return vault_url.strip(), client_id, client_secret, tenant_id


def _get_client(
    vault_url: str,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    tenant_id: Optional[str] = None,
):
    cache_key = _build_cache_key(vault_url, client_id, client_secret, tenant_id)

    with _cache_lock:
        if cache_key in _client_cache:
            return _client_cache[cache_key]

    try:
        from azure.keyvault.secrets import SecretClient
    except ImportError:
        raise ImportError(
            'Azure Key Vault SDK is not installed. '
            'Run: pip install azure-identity azure-keyvault-secrets'
        )

    if client_id and client_secret and tenant_id:
        try:
            from azure.identity import ClientSecretCredential
        except ImportError:
            raise ImportError(
                'azure-identity is not installed. '
                'Run: pip install azure-identity'
            )
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
    else:
        try:
            from azure.identity import DefaultAzureCredential
        except ImportError:
            raise ImportError(
                'azure-identity is not installed. '
                'Run: pip install azure-identity'
            )
        credential = DefaultAzureCredential()

    client = SecretClient(vault_url=vault_url, credential=credential)

    with _cache_lock:
        if cache_key not in _client_cache:
            _client_cache[cache_key] = client
        return _client_cache[cache_key]


def _validate_credential_params(
    client_id: Optional[str],
    client_secret: Optional[str],
    tenant_id: Optional[str],
) -> None:
    provided = {
        k for k, v in zip(
            _CREDENTIAL_PARAMS,
            (client_id, client_secret, tenant_id),
        ) if v
    }
    if provided and provided != set(_CREDENTIAL_PARAMS):
        missing = set(_CREDENTIAL_PARAMS) - provided
        raise ValueError(
            f'Incomplete Azure credentials: {", ".join(sorted(missing))} '
            f'must also be provided when using explicit credentials.'
        )


def get_secret(
    secret_name: str,
    vault_url: Optional[str] = None,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    tenant_id: Optional[str] = None,
    profile: Optional[str] = None,
) -> str:
    """Retrieve a secret from Azure Key Vault.

    Credential resolution order:
      1. If *profile* is given, resolve vault URL and credentials from
         environment variables named ``AZURE_KEY_VAULT_PROFILE_<NAME>_*``.
      2. Explicit *vault_url* / *client_id* / *client_secret* / *tenant_id*.
      3. Fall back to the ``AZURE_KEY_VAULT_URL`` environment variable with
         ``DefaultAzureCredential``.

    Profiles let users configure vault credentials once via environment
    variables and reference them by name in pipelines::

        # Environment variables
        AZURE_KEY_VAULT_PROFILE_CUSTOMER1_URL=https://customer1.vault.azure.net/
        AZURE_KEY_VAULT_PROFILE_CUSTOMER1_CLIENT_ID=...
        AZURE_KEY_VAULT_PROFILE_CUSTOMER1_CLIENT_SECRET=...
        AZURE_KEY_VAULT_PROFILE_CUSTOMER1_TENANT_ID=...

        # Pipeline YAML
        {{ azure_secret_var('API_KEY', profile='customer1') }}

    SecretClient instances are cached per unique combination of vault URL
    and credentials so repeated calls reuse the same connection.

    Raises:
        ValueError: If vault_url cannot be determined, if secret_name is
            empty, if only some credential parameters are provided, or if
            a profile is not configured.
        ImportError: If the Azure SDK packages are not installed.
    """
    if not secret_name or not secret_name.strip():
        raise ValueError('secret_name must be a non-empty string.')

    if profile:
        p_vault_url, p_client_id, p_client_secret, p_tenant_id = (
            _resolve_profile(profile)
        )
        vault_url = vault_url or p_vault_url
        client_id = client_id or p_client_id
        client_secret = client_secret or p_client_secret
        tenant_id = tenant_id or p_tenant_id

    _validate_credential_params(client_id, client_secret, tenant_id)

    if vault_url is None:
        vault_url = os.getenv(ENV_VAR_KEY_VAULT_URL)

    if not vault_url or not vault_url.strip():
        raise ValueError(
            'No Azure Key Vault URL provided. Either pass the vault_url '
            f'parameter, set a profile, or set the {ENV_VAR_KEY_VAULT_URL} '
            'environment variable.'
        )

    vault_url = vault_url.strip()

    client = _get_client(vault_url, client_id, client_secret, tenant_id)
    return client.get_secret(secret_name).value


def clear_client_cache() -> None:
    """Remove all cached SecretClient instances.

    Useful when credentials have been rotated or during testing.
    """
    with _cache_lock:
        _client_cache.clear()
