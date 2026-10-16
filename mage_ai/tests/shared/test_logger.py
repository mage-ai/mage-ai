import http.client
import io
import json
import logging
import unittest
from unittest.mock import Mock

from kubernetes import client
from urllib3.response import HTTPResponse

from mage_ai.shared.logger import KubernetesResponseBodyFilter, set_logging_format


class KubernetesLoggingTests(unittest.TestCase):
    def setUp(self):
        self.root = logging.getLogger()
        self.rest = logging.getLogger('kubernetes.client.rest')
        self.loggers = [self.root, self.rest, logging.getLogger('client'),
                        logging.getLogger('urllib3')]
        self.states = [
            (logger, logger.level, logger.handlers[:], logger.filters[:], logger.propagate)
            for logger in self.loggers
        ]
        self.debuglevel = http.client.HTTPConnection.debuglevel
        self.root.handlers = []
        self.rest.handlers = []
        self.rest.filters = []
        self.rest.propagate = True

    def tearDown(self):
        for logger, level, handlers, filters, propagate in self.states:
            logger.setLevel(level)
            logger.handlers = handlers
            logger.filters = filters
            logger.propagate = propagate
        http.client.HTTPConnection.debuglevel = self.debuglevel

    def test_api_responses_exclude_credentials_and_preserve_results(self):
        credential = 'DUMMY_CREDENTIAL_FOR_LOGGING_TEST_ONLY'
        pod_spec = {
            'restartPolicy': 'Never',
            'containers': [{'name': 'dummy', 'env': [
                {'name': 'ARBITRARY_SECRET_NAME', 'value': credential},
            ]}],
            'initContainers': [{'name': 'init', 'env': [
                {'name': 'ANOTHER_SECRET', 'value': credential},
            ]}],
        }
        pod = {'apiVersion': 'v1', 'kind': 'Pod',
               'metadata': {'name': 'dummy'}, 'spec': pod_spec}
        job = {'apiVersion': 'batch/v1', 'kind': 'Job',
               'metadata': {'name': 'dummy'},
               'spec': {'template': {'spec': pod_spec}}, 'status': {'succeeded': 1}}
        stateful_set = {
            'apiVersion': 'apps/v1', 'kind': 'StatefulSet',
            'metadata': {'name': 'dummy'},
            'spec': {'serviceName': 'dummy', 'selector': {'matchLabels': {'app': 'dummy'}},
                     'template': {'spec': pod_spec}},
        }
        responses = [
            (client.BatchV1Api, 'read_namespaced_job', job, {'name': 'dummy'}),
            (client.CoreV1Api, 'read_namespaced_pod', pod, {'name': 'dummy'}),
            (client.AppsV1Api, 'read_namespaced_stateful_set', stateful_set, {'name': 'dummy'}),
            (client.CoreV1Api, 'list_namespaced_pod',
             {'apiVersion': 'v1', 'kind': 'PodList', 'items': [pod]}, {}),
            (client.AppsV1Api, 'list_namespaced_stateful_set',
             {'apiVersion': 'apps/v1', 'kind': 'StatefulSetList', 'items': [stateful_set]}, {}),
        ]
        for output_format in (None, 'json'):
            for level in ('DEBUG', 'INFO'):
                for debug in (False, True):
                    for api_class, method, body, kwargs in responses:
                        with self.subTest(format=output_format, level=level,
                                          debug=debug, method=method):
                            configuration = client.Configuration()
                            configuration.debug = debug
                            self.rest.setLevel(logging.NOTSET if not debug else logging.DEBUG)
                            set_logging_format(output_format, level=level)
                            capture = io.StringIO()
                            self.root.handlers[-1].setStream(capture)
                            with client.ApiClient(configuration) as api_client:
                                transport = Mock()
                                transport.request.side_effect = lambda *a, **k: HTTPResponse(
                                    body=json.dumps(body).encode(), status=200,
                                    headers={'Content-Type': 'application/json'},
                                    preload_content=True,
                                )
                                api_client.rest_client.pool_manager = transport
                                result = getattr(api_class(api_client), method)(
                                    namespace='dummy', **kwargs,
                                )
                                # Credentials still reach the caller: only logging is suppressed.
                                self.assertIn(credential, str(result.to_dict()))
                                transport.request.assert_called_once()
                            self.assertNotIn(credential, capture.getvalue())
                            self.assertNotIn('response body:', capture.getvalue())

    def test_filter_protects_existing_and_later_handlers(self):
        capture = io.StringIO()
        existing_handler = logging.StreamHandler(capture)
        self.root.addHandler(logging.NullHandler())
        self.root.addHandler(existing_handler)
        set_logging_format(level='DEBUG')
        self.rest.addHandler(logging.StreamHandler(capture))
        self.root.addHandler(logging.StreamHandler(capture))
        self.rest.setLevel(logging.DEBUG)
        self.rest.debug('response body: %s', 'DUMMY_SECRET')
        self.rest.warning('Kubernetes connection failed')
        self.assertNotIn('DUMMY_SECRET', capture.getvalue())
        self.assertIn('Kubernetes connection failed', capture.getvalue())

    def test_repeated_setup_preserves_other_debug_diagnostics(self):
        set_logging_format(level='DEBUG')
        set_logging_format('json', level='DEBUG')
        filters = [f for f in self.rest.filters if isinstance(f, KubernetesResponseBodyFilter)]
        self.assertEqual(len(filters), 1)
        capture = io.StringIO()
        self.root.handlers[-1].setStream(capture)
        self.rest.setLevel(logging.DEBUG)
        self.rest.debug('Kubernetes diagnostic')
        logging.getLogger(__name__).debug('Mage diagnostic')
        self.assertIn('Kubernetes diagnostic', capture.getvalue())
        self.assertIn('Mage diagnostic', capture.getvalue())

    def test_filter_drops_non_json_bodies_without_parsing(self):
        body_filter = KubernetesResponseBodyFilter()
        for body in ('not JSON', '{malformed', 'DUMMY_SECRET'):
            record = logging.LogRecord(
                self.rest.name, logging.DEBUG, __file__, 1, 'response body: %s', (body,), None,
            )
            self.assertFalse(body_filter.filter(record))
        record = logging.LogRecord(
            'mage_ai.test', logging.DEBUG, __file__, 1, 'response body: example', (), None,
        )
        self.assertTrue(body_filter.filter(record))
