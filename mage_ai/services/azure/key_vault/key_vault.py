import os
import threading
from typing import Optional

ENV_VAR_KEY_VAULT_URL = 'AZURE_KEY_VAULT_URL'

_client_cache = {}
_cache_lock = threading.Lock()

_CREDENTIAL_PARAMS = ('client_id', 'client_secret', 'tenant_id')


def _build_cache_key(
    vault_url: str,
    client_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
) -> str:
    return f"{vault_url}|{client_id or ''}|{tenant_id or ''}"


def _get_client(
    vault_url: str,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    tenant_id: Optional[str] = None,
):
    from azure.keyvault.secrets import SecretClient

    cache_key = _build_cache_key(vault_url, client_id, tenant_id)

    with _cache_lock:
        if cache_key in _client_cache:
            return _client_cache[cache_key]

    if client_id and client_secret and tenant_id:
        from azure.identity import ClientSecretCredential

        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
    else:
        from azure.identity import DefaultAzureCredential

        credential = DefaultAzureCredential()

    client = SecretClient(vault_url=vault_url, credential=credential)

    with _cache_lock:
        _client_cache.setdefault(cache_key, client)
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
) -> str:
    """Retrieve a secret from Azure Key Vault.

    When vault_url is omitted, falls back to the AZURE_KEY_VAULT_URL
    environment variable.  Passing explicit credential parameters
    (client_id, client_secret, tenant_id) creates a dedicated
    ClientSecretCredential for that vault; otherwise
    DefaultAzureCredential is used.

    SecretClient instances are cached per (vault_url, client_id,
    tenant_id) tuple so repeated calls reuse the same connection.

    Raises:
        ValueError: If vault_url is not provided and AZURE_KEY_VAULT_URL
            is not set, if secret_name is empty, or if only some of the
            credential parameters are provided.
    """
    if not secret_name or not secret_name.strip():
        raise ValueError('secret_name must be a non-empty string.')

    _validate_credential_params(client_id, client_secret, tenant_id)

    if vault_url is None:
        vault_url = os.getenv(ENV_VAR_KEY_VAULT_URL)

    if not vault_url or not vault_url.strip():
        raise ValueError(
            'No Azure Key Vault URL provided. Either pass the vault_url '
            f'parameter or set the {ENV_VAR_KEY_VAULT_URL} environment variable.'
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
