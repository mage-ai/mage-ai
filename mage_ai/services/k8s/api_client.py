"""Kubernetes transport that keeps sensitive wire data out of diagnostics."""

from contextlib import contextmanager
from contextvars import ContextVar
from http import HTTPStatus
import logging

from kubernetes import client
from kubernetes.client.exceptions import ApiException
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool
from urllib3.exceptions import HTTPError
from urllib3.response import HTTPResponse

from mage_ai.shared.logger import configure_kubernetes_logging

logger = logging.getLogger(__name__)
_protected_request = ContextVar('mage_kubernetes_request', default=False)


class _TransportLogFilter(logging.Filter):
    def filter(self, record):
        # URLs, retry reasons, and peer responses can all contain credentials.
        # Other HTTP clients keep their diagnostics, including in other threads.
        return not _protected_request.get()


@contextmanager
def _safe_diagnostics():
    token = _protected_request.set(True)
    try:
        yield
    except ApiException as error:
        raise _safe_api_exception(error) from None
    except KubernetesTransportError:
        raise
    except HTTPError as error:
        raise KubernetesTransportError(
            f'Kubernetes transport failed ({type(error).__name__})',
        ) from None
    finally:
        _protected_request.reset(token)


class KubernetesTransportError(HTTPError):
    """Transport failure without a credential-bearing URL or remote payload."""


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


class _SafeHTTPResponse(HTTPResponse):
    def read(self, *args, **kwargs):
        with _safe_diagnostics():
            return super().read(*args, **kwargs)

    def read_chunked(self, *args, **kwargs):
        chunks = super().read_chunked(*args, **kwargs)
        while True:
            # Leave the guard before yielding control back to the caller.
            with _safe_diagnostics():
                try:
                    chunk = next(chunks)
                except StopIteration:
                    return
            yield chunk


class _HTTPConnectionPool(HTTPConnectionPool):
    ConnectionCls = _HTTPConnection
    ResponseCls = _SafeHTTPResponse


class _HTTPSConnectionPool(HTTPSConnectionPool):
    ConnectionCls = _HTTPSConnection
    ResponseCls = _SafeHTTPResponse


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
        for name in (
            'urllib3.connection', 'urllib3.connectionpool', 'urllib3.poolmanager',
            'urllib3.response', 'urllib3.util.retry', 'urllib3.contrib.pyopenssl',
        ):
            transport_logger = logging.getLogger(name)
            if not any(isinstance(f, _TransportLogFilter) for f in transport_logger.filters):
                transport_logger.addFilter(_TransportLogFilter())
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
            with _safe_diagnostics():
                response = super().request(*args, **kwargs)
                logger.debug('Kubernetes API request completed (HTTP %s)', response.status)
                return response
        except ValueError:
            # HTTP header validation errors can quote the authorization value.
            raise ValueError('Invalid Kubernetes API request') from None

    def deserialize(self, response, response_type):
        # Conversion errors can quote credential-bearing values from the body.
        try:
            with _safe_diagnostics():
                return super().deserialize(response, response_type)
        except ValueError:
            raise ValueError('Invalid Kubernetes API response') from None

    def _ApiClient__call_api(self, *args, **kwargs):
        # The generated client dispatches both synchronous calls and async workers
        # here. Protect stream() too, which temporarily replaces request(). This
        # dependency hook is regression-tested against supported client versions.
        with _safe_diagnostics():
            return super()._ApiClient__call_api(*args, **kwargs)
