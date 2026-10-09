"""Kubernetes transport that keeps sensitive wire data out of diagnostics."""

from http import HTTPStatus
import logging

from kubernetes import client
from kubernetes.client.exceptions import ApiException
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool

from mage_ai.shared.logger import configure_kubernetes_logging

logger = logging.getLogger(__name__)


class _NoWireDebug:
    # Configuration.debug changes http.client.HTTPConnection.debuglevel globally.
    # Shadow it on Mage's connections, even when debugging is enabled later.
    debuglevel = 0

    def set_debuglevel(self, level):
        self.debuglevel = 0


class _HTTPConnection(_NoWireDebug, HTTPConnection):
    pass


class _HTTPSConnection(_NoWireDebug, HTTPSConnection):
    pass


class _HTTPConnectionPool(HTTPConnectionPool):
    ConnectionCls = _HTTPConnection


class _HTTPSConnectionPool(HTTPSConnectionPool):
    ConnectionCls = _HTTPSConnection


def _safe_api_exception(error: ApiException) -> ApiException:
    # Neither remote reason phrases nor error bodies/headers are safe diagnostics.
    # Preserve status codes for callers that distinguish e.g. 404 from other errors.
    try:
        reason = HTTPStatus(error.status).phrase
    except (TypeError, ValueError):
        reason = 'Kubernetes API request failed'
    return ApiException(status=error.status, reason=reason)


class KubernetesApiClient(client.ApiClient):
    def __init__(self, *args, **kwargs):
        configure_kubernetes_logging()
        super().__init__(*args, **kwargs)
        # Use a per-manager copy: do not change urllib3 pools for unrelated clients.
        # This applies equally to PoolManager and ProxyManager and retains TLS,
        # authentication, timeout, retry, and proxy settings from the client.
        manager = self.rest_client.pool_manager
        manager.pool_classes_by_scheme = dict(manager.pool_classes_by_scheme)
        manager.pool_classes_by_scheme.update({
            'http': _HTTPConnectionPool,
            'https': _HTTPSConnectionPool,
        })

    def request(self, *args, **kwargs):
        try:
            response = super().request(*args, **kwargs)
            logger.debug('Kubernetes API request completed (HTTP %s)', response.status)
            return response
        except ApiException as error:
            # Suppress the original exception's context in formatted tracebacks.
            raise _safe_api_exception(error) from None

    def call_api(self, *args, **kwargs):
        try:
            return super().call_api(*args, **kwargs)
        except ApiException as error:
            # Also protect synchronous websocket operations, whose stream helper
            # temporarily replaces request(). HTTP async calls use request() above.
            raise _safe_api_exception(error) from None
