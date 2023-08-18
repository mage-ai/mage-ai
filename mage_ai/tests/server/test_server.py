import asyncio
import os
import shutil
from unittest.mock import patch

import tornado.httputil
import tornado.ioloop

import mage_ai.server.server as server_module
from mage_ai.server.server import make_app, replace_base_path
from mage_ai.tests.base_test import TestCase


class ServerTests(TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        return super().setUp()

    def tearDown(self):
        self.loop.close()
        tornado.ioloop.IOLoop.instance().stop()
        return super().tearDown()

    def test_make_app(self):
        app = make_app()

        self.assertIsNotNone(app)

    @patch('mage_ai.server.server.ROUTES_BASE_PATH', 'test_prefix')
    def test_make_app_with_update_routes(self):
        app = make_app(update_routes=True)
        request = tornado.httputil.HTTPServerRequest(
            method='GET',
            uri='/test_prefix',
        )
        handler = app.default_router.find_handler(request)
        self.assertIsNotNone(handler)

        request = tornado.httputil.HTTPServerRequest(
            method='GET',
            uri='/test_prefix/pipelines',
        )
        handler = app.default_router.find_handler(request)
        self.assertIsNotNone(handler)

        request = tornado.httputil.HTTPServerRequest(
            method='GET',
            uri='/pipelines',
        )
        handler = app.default_router.find_handler(request)
        self.assertIsNone(handler)

    @patch('mage_ai.server.server.REQUESTS_BASE_PATH', 'random-test-string-1hasdfh')
    @patch('mage_ai.server.server.get_variables_dir')
    def test_replace_base_path(self, mock_variables_dir):
        mock_variables_dir.return_value = os.path.dirname(server_module.__file__)
        with patch(
            'mage_ai.server.server.BASE_PATH_EXPORTS_FOLDER',
            'base_path_test',
        ):
            replace_base_path(base_path='test_prefix')

        test_dir = os.path.join(os.path.dirname(server_module.__file__), 'base_path_test')
        self.assertTrue(len(os.listdir(test_dir)) > 0)
        with open(os.path.join(test_dir, 'index.html'), 'r') as f:
            self.assertNotEqual(f.read().find('random-test-string-1hasdfh'), 0)
        shutil.rmtree(test_dir)

    @patch('mage_ai.server.server.REQUESTS_BASE_PATH', 'test_prefix')
    @patch('mage_ai.server.server.get_variables_dir')
    def test_replace_base_path_directory_exists(self, mock_variables_dir):
        mock_variables_dir.return_value = os.path.dirname(server_module.__file__)
        test_dir = os.path.join(os.path.dirname(server_module.__file__), 'base_path_test')
        os.makedirs(test_dir)
        with patch(
            'mage_ai.server.server.BASE_PATH_EXPORTS_FOLDER',
            'base_path_test',
        ):
            replace_base_path(base_path='test_prefix')

        self.assertTrue(len(os.listdir(test_dir)) > 0)
        shutil.rmtree(test_dir)

    @patch('mage_ai.server.server.REQUESTS_BASE_PATH', 'test_prefix')
    @patch('mage_ai.server.server.get_variables_dir')
    def test_replace_base_path_s3_directory(self, mock_variables_dir):
        mock_variables_dir.return_value = 's3://test-bucket/test-prefix'
        test_dir = os.path.join(self.repo_path, 'base_path_test')
        with patch(
            'mage_ai.server.server.DEFAULT_MAGE_DATA_DIR',
            test_dir,
        ):
            replace_base_path(base_path='test_prefix')

        self.assertTrue(len(os.listdir(os.path.join(test_dir, 'test'))) > 0)
        shutil.rmtree(test_dir)
