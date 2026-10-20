import unittest
from unittest.mock import AsyncMock, patch

from mage_ai.authentication.providers.oidc import OidcProvider


class OidcProviderTest(unittest.IsolatedAsyncioTestCase):
    async def test_get_user_info(self):
        # Define test cases
        test_cases = [
            {
                'user_roles': ['RoleMap-Admin', 'RoleMap-Editor'],
                'expected_roles': ['Admin', 'Editor'],
                'use_roles_mapping': True
            },
            {
                'user_roles': ['Admin', 'Editor'],
                'expected_roles': ['Admin', 'Editor'],
                'use_roles_mapping': False
            }
        ]

        # Patching the __init__ method to completely replace it
        with patch.object(OidcProvider, '__init__', return_value=None):
            for case in test_cases:
                # Creating an instance of OidcProvider with userinfo_endpoint included
                instance = OidcProvider()
                instance.userinfo_endpoint = 'http://fake.userinfo.endpoint'

                # Set the roles_mapping object variable
                if case['use_roles_mapping']:
                    instance.roles_mapping = {'RoleMap-Admin': 'Admin', 'RoleMap-Editor': 'Editor'}

                # Mocking the aiohttp.ClientSession.get method
                with patch('aiohttp.ClientSession.get') as mocked_get:
                    mocked_get_response = AsyncMock()
                    mocked_get_response.json = AsyncMock(return_value={
                        'email': 'test@example.com',
                        'preferred_username': 'test_user',
                        'user_roles': case['user_roles']
                    })
                    mocked_get.return_value.__aenter__.return_value = mocked_get_response

                    # Call get_user_info method with a dummy access token
                    user_info = await instance.get_user_info('fake_access_token')

                    # Asserting the returned dictionary keys
                    self.assertIn('email', user_info)
                    self.assertIn('username', user_info)
                    self.assertIn('user_roles', user_info)

                    # Asserting the values of specific keys
                    self.assertEqual(user_info['email'], 'test@example.com')
                    self.assertEqual(user_info['username'], 'test_user')
                    self.assertListEqual(user_info['user_roles'], case['expected_roles'])


if __name__ == '__main__':
    unittest.main()
