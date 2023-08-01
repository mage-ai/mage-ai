import asyncio
import os
import shutil
from unittest.mock import patch

import tornado.httputil
import tornado.ioloop

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

    @patch('mage_ai.server.server.BASE_PATH', 'test_prefix')
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

    @patch('mage_ai.server.server.BASE_PATH', 'test_prefix')
    def test_replace_base_path(self):
        directory_path = os.path.join(os.getcwd(), 'test')
        folder_path = os.path.join(directory_path, 'static')
        os.makedirs(folder_path, exist_ok=True)

        with open(os.path.join(folder_path, 'test.js'), 'w', encoding='utf-8') as f:
            f.write(
                """
this is a test string /CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_
huh       src:url(/fonts/Roboto/Roboto-Thin.ttf) ???
blah blah blah <link href="/favicon.ico" rel="icon"/>
"""
            )
        with patch(
            'mage_ai.server.server.BASE_PATH_STATIC_EXPORTS_FOLDER',
            os.path.join(os.getcwd(), 'test', 'static'),
        ):
            replace_base_path(base_path='test_prefix')
        with open(os.path.join(folder_path, 'test.js'), 'r', encoding='utf-8') as f:
            text = f.read()
            self.assertEqual(
                text,
                """
this is a test string /test_prefix
huh       src:url(/test_prefix/fonts/Roboto/Roboto-Thin.ttf) ???
blah blah blah <link href="/test_prefix/favicon.ico" rel="icon"/>
"""
            )

        shutil.rmtree(directory_path)
