import os
import unittest
from unittest.mock import patch

from mage_ai.authentication.providers.okta import OktaProvider

test_parameters = [
    ('https://samples.auth0.com', 'test-client-id', 'test-client-secret'),
    ('samples.auth0.com', 'test-client-id', 'test-client-secret'),
    ('', 'test-client-id', 'test-client-secret'),
    ('samples.auth0.com', '', ''),
]


class OktaProviderTest(unittest.TestCase):
    def setUp(self):
        self.authorization_endpoint = 'https://samples.auth0.com/authorize'
        self.token_endpoint = 'https://samples.auth0.com/oauth/token'
        self.userinfo_endpoint = 'https://samples.auth0.com/userinfo'

    def test_okta_provider_initialization(self):
        for url, id, secret in test_parameters:
            with self.subTest():
                with patch.dict(
                    os.environ,
                    dict(
                        OKTA_DOMAIN_URL=url,
                        OKTA_CLIENT_ID=id,
                        OKTA_CLIENT_SECRET=secret,
                    ),
                ):
                    if not all([url, id]):
                        with self.assertRaises(ValueError):
                            provider = OktaProvider()
                    else:
                        provider = OktaProvider()
                        self.assertEqual(
                            provider.authorization_endpoint, self.authorization_endpoint
                        )
                        self.assertEqual(provider.token_endpoint, self.token_endpoint)
                        self.assertEqual(
                            provider.userinfo_endpoint, self.userinfo_endpoint
                        )
