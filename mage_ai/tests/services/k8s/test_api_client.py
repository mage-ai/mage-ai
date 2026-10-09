import datetime
import http.client
import io
import ipaddress
import json
import logging
import ssl
import tempfile
import threading
import traceback
import unittest
from contextlib import redirect_stderr, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from kubernetes import client
from kubernetes.client.exceptions import ApiException
from urllib3.connectionpool import HTTPConnectionPool

from mage_ai.services.k8s.api_client import KubernetesApiClient
from mage_ai.shared.logger import set_logging_format


SECRET = 'DUMMY_CREDENTIAL_FOR_WIRE_LOGGING_TEST_ONLY'
JOB = {
    'apiVersion': 'batch/v1', 'kind': 'Job', 'metadata': {'name': 'dummy'},
    'spec': {'template': {'spec': {'containers': [
        {'name': 'dummy', 'env': [{'name': 'ARBITRARY_SECRET', 'value': SECRET}]},
    ]}}},
    'status': {'succeeded': 1},
}


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.server.requests.append((dict(self.headers), None))
        self.respond()

    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        self.server.requests.append((dict(self.headers), json.loads(body)))
        self.respond()

    def respond(self):
        body = json.dumps(JOB).encode()
        # Include dummy secrets even in the remote reason phrase and headers.
        self.send_response(self.server.status, SECRET)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Set-Cookie', SECRET)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class KubernetesApiClientTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        path = Path(cls.directory.name)
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'localhost')])
        now = datetime.datetime.now(datetime.timezone.utc)
        cert = (
            x509.CertificateBuilder().subject_name(subject).issuer_name(subject)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(minutes=1))
            .not_valid_after(now + datetime.timedelta(days=1))
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
            .add_extension(x509.SubjectAlternativeName([
                x509.DNSName('localhost'), x509.IPAddress(ipaddress.ip_address('127.0.0.1')),
            ]), critical=False).sign(key, hashes.SHA256())
        )
        cls.cert_path = str(path / 'cert.pem')
        Path(cls.cert_path).write_bytes(cert.public_bytes(serialization.Encoding.PEM))
        key_path = path / 'key.pem'
        key_path.write_bytes(key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ))
        cls.servers = []
        for secure in (False, True):
            server = ThreadingHTTPServer(('127.0.0.1', 0), _Handler)
            server.status = 200
            server.requests = []
            if secure:
                context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                context.load_cert_chain(cls.cert_path, str(key_path))
                server.socket = context.wrap_socket(server.socket, server_side=True)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            cls.servers.append((server, thread))

    @classmethod
    def tearDownClass(cls):
        for server, thread in cls.servers:
            server.shutdown()
            server.server_close()
            thread.join()
        cls.directory.cleanup()

    def setUp(self):
        self.states = []
        for name in ('', 'kubernetes.client.rest', 'client', 'urllib3'):
            logger = logging.getLogger(name)
            self.states.append((logger, logger.level, logger.handlers[:], logger.filters[:]))
        self.debuglevel = http.client.HTTPConnection.debuglevel
        logging.getLogger().handlers = []
        for server, _ in self.servers:
            server.status = 200
            server.requests.clear()

    def tearDown(self):
        for logger, level, handlers, filters in self.states:
            logger.setLevel(level)
            logger.handlers = handlers
            logger.filters = filters
        http.client.HTTPConnection.debuglevel = self.debuglevel

    def configuration(self, transport):
        server = self.servers[transport == 'https'][0]
        configuration = client.Configuration()
        scheme = 'https' if transport == 'https' else 'http'
        configuration.host = f'{scheme}://127.0.0.1:{server.server_port}'
        configuration.ssl_ca_cert = self.cert_path
        configuration.api_key['authorization'] = SECRET
        configuration.api_key_prefix['authorization'] = 'Bearer'
        if transport == 'proxy':
            configuration.proxy = configuration.host
            configuration.host = 'http://kubernetes.invalid'
            configuration.proxy_headers = {'Proxy-Authorization': SECRET}
            configuration.no_proxy = 'localhost'
        return configuration, server

    def test_real_requests_keep_credentials_out_of_logs_and_stdio(self):
        for transport in ('http', 'https', 'proxy'):
            for level in ('DEBUG', 'INFO'):
                for output_format in (None, 'json'):
                    for debug in (False, True):
                        with self.subTest(transport=transport, level=level,
                                          format=output_format, debug=debug):
                            capture = io.StringIO()
                            with redirect_stdout(capture), redirect_stderr(capture):
                                set_logging_format(output_format, level=level)
                                configuration, server = self.configuration(transport)
                                configuration.debug = debug
                                with KubernetesApiClient(configuration) as api_client:
                                    api = client.BatchV1Api(api_client)
                                    result = api.create_namespaced_job('dummy', JOB)
                                    self.assertEqual(result.status.succeeded, 1)
                                    self.assertIn(SECRET, str(result.to_dict()))
                                    # Enable global wire tracing after creation too.
                                    configuration.debug = True
                                    result = api.read_namespaced_job('dummy', 'dummy')
                                    self.assertEqual(result.status.succeeded, 1)
                                    server.status = 404
                                    try:
                                        api.read_namespaced_job('missing', 'dummy')
                                    except ApiException as error:
                                        self.assertEqual(error.status, 404)
                                        self.assertIsNone(error.body)
                                        self.assertIsNone(error.headers)
                                        logging.getLogger(__name__).exception(
                                            'Kubernetes operation failed',
                                        )
                                        print(str(error))
                                        print(traceback.format_exc())
                                    else:
                                        self.fail('Expected a Kubernetes API error')
                                    server.status = 200
                                logging.getLogger(__name__).info('Safe Kubernetes diagnostic')
                            self.assertNotIn(SECRET, capture.getvalue())
                            self.assertIn('Safe Kubernetes diagnostic', capture.getvalue())
                            self.assertIn('Not Found', capture.getvalue())
                            if level == 'DEBUG':
                                self.assertIn('Kubernetes API request completed (HTTP 200)',
                                              capture.getvalue())
                            headers, body = server.requests[-3]
                            self.assertEqual(headers['authorization'], f'Bearer {SECRET}')
                            self.assertEqual(body, JOB)
                            if transport == 'proxy':
                                self.assertEqual(headers['Proxy-Authorization'], SECRET)

    def test_async_api_errors_are_safe(self):
        configuration, server = self.configuration('http')
        server.status = 403
        capture = io.StringIO()
        with redirect_stdout(capture), redirect_stderr(capture):
            set_logging_format(level='DEBUG')
            configuration.debug = True
            with KubernetesApiClient(configuration) as api_client:
                future = client.BatchV1Api(api_client).read_namespaced_job(
                    'dummy', 'dummy', async_req=True,
                )
                try:
                    future.get()
                except ApiException as error:
                    self.assertEqual(error.status, 403)
                    print(traceback.format_exc())
                else:
                    self.fail('Expected an async API error')
        self.assertNotIn(SECRET, capture.getvalue())
        self.assertIn('Forbidden', capture.getvalue())

    def test_unprotected_wire_tracing_exposes_dummy_credentials(self):
        # Positive control: the real transport test must detect the original leak.
        configuration, _ = self.configuration('http')
        capture = io.StringIO()
        with redirect_stdout(capture), redirect_stderr(capture):
            configuration.debug = True
            with client.ApiClient(configuration) as api_client:
                client.BatchV1Api(api_client).create_namespaced_job('dummy', JOB)
        self.assertIn(SECRET, capture.getvalue())

    def test_stream_request_replacement_errors_are_safe(self):
        configuration, _ = self.configuration('http')
        with KubernetesApiClient(configuration) as api_client:
            # kubernetes.stream temporarily replaces request with its websocket transport.
            with patch.object(api_client, 'request', side_effect=ApiException(
                status=0, reason=SECRET,
            )):
                with self.assertRaises(ApiException) as caught:
                    client.CoreV1Api(api_client).connect_get_namespaced_pod_exec('dummy', 'dummy')
                self.assertNotIn(SECRET, str(caught.exception))
                self.assertTrue(caught.exception.__suppress_context__)

    def test_pool_configuration_is_local_and_preserves_tls(self):
        configuration, _ = self.configuration('https')
        with client.ApiClient(configuration) as ordinary:
            self._assert_pool_configuration(ordinary, configuration)

    def _assert_pool_configuration(self, ordinary, configuration):
        with KubernetesApiClient(configuration) as safe:
            self.assertIs(ordinary.rest_client.pool_manager.pool_classes_by_scheme['http'],
                          HTTPConnectionPool)
            self.assertIsNot(safe.rest_client.pool_manager.pool_classes_by_scheme,
                             ordinary.rest_client.pool_manager.pool_classes_by_scheme)
            self.assertEqual(safe.rest_client.pool_manager.connection_pool_kw['cert_reqs'],
                             ssl.CERT_REQUIRED)
            self.assertEqual(safe.rest_client.pool_manager.connection_pool_kw['ca_certs'],
                             self.cert_path)
