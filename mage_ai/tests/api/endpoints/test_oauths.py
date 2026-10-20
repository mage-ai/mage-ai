import os

from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)


class OauthAPIEndpointTest(BaseAPIEndpointTest):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        os.environ['GOOGLE_CLIENT_ID'] = 'test'
        os.environ['GOOGLE_CLIENT_SECRET'] = 'test secret'

    @classmethod
    def tearDownClass(self):
        super().tearDownClass()
        del os.environ['GOOGLE_CLIENT_ID']
        del os.environ['GOOGLE_CLIENT_SECRET']


build_list_endpoint_tests(
    OauthAPIEndpointTest,
    resource='oauths',
    list_count=1,
    build_query=lambda self: dict(redirect_uri=['http://localhost:3000/pipelines']),
    result_keys_to_compare=[
        'provider',
        'url',
        'redirect_query_params',
    ],
)
