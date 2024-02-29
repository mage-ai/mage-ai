import json
import os
import unittest
from unittest.mock import AsyncMock, Mock, patch

from mage_ai.authentication.providers.active_directory import ADProvider


class ADProviderTest(unittest.IsolatedAsyncioTestCase):
    @patch('aiohttp.ClientSession')
    async def test_map_ad_roles_to_mage_roles(self, mock_client_session):
        roles_mapping = json.dumps(
            {
                'Mage.TestRole': 'mage_role_1',
                'Mage.TestEditRole': 'mage_role_2',
            }
        )

        with patch.dict(
            os.environ,
            dict(
                ACTIVE_DIRECTORY_DIRECTORY_ID='test_directory_id',
                ACTIVE_DIRECTORY_CLIENT_ID='test_client_id',
                ACTIVE_DIRECTORY_CLIENT_SECRET='test_client_secret',
                ACTIVE_DIRECTORY_ROLES_MAPPING=roles_mapping,
            ),
        ):

            def side_effect(*args, **kwargs):
                response = AsyncMock()
                response.__aenter__ = AsyncMock(return_value=response)
                response.__aexit__ = AsyncMock(return_value=None)
                url = args[0]
                if url == 'https://graph.microsoft.com/v1.0/me':
                    response.json.return_value = {
                        'businessPhones': [],
                        'displayName': 'Mage Mage',
                        'givenName': 'Mage',
                        'jobTitle': None,
                        'mail': None,
                        'mobilePhone': None,
                        'officeLocation': None,
                        'preferredLanguage': 'en',
                        'surname': 'Mage',
                        'userPrincipalName': 'test@test.com',
                        'id': '6110b51e-23f8-4cd4-a5e1-c04698a9f9c3',
                    }
                elif url.startswith(
                    'https://graph.microsoft.com/v1.0/servicePrincipals?'
                ):
                    response.json.return_value = {
                        'value': [{'id': 'fa5f493f-3d51-4f33-98cc-b1be17f4f2e6'}],
                    }
                elif url.startswith(
                    'https://graph.microsoft.com/v1.0/servicePrincipals/'
                ):
                    response.json.return_value = {
                        'value': [
                            {
                                'allowedMemberTypes': ['User'],
                                'description': 'mage',
                                'displayName': 'mage role',
                                'id': '5bab36bf-bf47-4b93-8001-48ccf01cccb2',
                                'isEnabled': True,
                                'origin': 'Application',
                                'value': 'Mage.TestRole',
                            },
                            {
                                'allowedMemberTypes': ['User'],
                                'description': 'mage',
                                'displayName': 'mage edit role',
                                'id': '2dac98e2-3d69-497e-8f88-41588776161e',
                                'isEnabled': True,
                                'origin': 'Application',
                                'value': 'Mage.TestEditRole',
                            },
                        ],
                    }
                elif url.startswith(
                    'https://graph.microsoft.com/v1.0/me/appRoleAssignments'
                ):
                    response.json.return_value = {
                        'value': [
                            {
                                'id': '1',
                                'deletedDateTime': None,
                                'appRoleId': '00000000-0000-0000-0000-000000000000',
                                'createdDateTime': '2023-12-19T00:14:11.6216076Z',
                                'principalDisplayName': 'Mage Mage',
                                'principalId': '6110b51e-23f8-4cd4-a5e1-c04698a9f9c3',
                                'principalType': 'User',
                                'resourceDisplayName': 'mage',
                                'resourceId': 'fa5f493f-3d51-4f33-98cc-b1be17f4f2e6',
                            },
                            {
                                'id': '2',
                                'deletedDateTime': None,
                                'appRoleId': '5bab36bf-bf47-4b93-8001-48ccf01cccb2',
                                'createdDateTime': '2024-01-10T22:48:19.0510394Z',
                                'principalDisplayName': 'Mage Mage',
                                'principalId': '6110b51e-23f8-4cd4-a5e1-c04698a9f9c3',
                                'principalType': 'User',
                                'resourceDisplayName': 'mage',
                                'resourceId': 'fa5f493f-3d51-4f33-98cc-b1be17f4f2e6',
                            },
                            {
                                'id': '2',
                                'deletedDateTime': None,
                                'appRoleId': '2dac98e2-3d69-497e-8f88-41588776161e',
                                'createdDateTime': '2024-01-10T22:48:19.0510394Z',
                                'principalDisplayName': 'Mage Mage',
                                'principalId': '6110b51e-23f8-4cd4-a5e1-c04698a9f9c3',
                                'principalType': 'User',
                                'resourceDisplayName': 'mage',
                                'resourceId': 'fa5f493f-3d51-4f33-98cc-b1be17f4f2e6',
                            },
                        ],
                    }
                return response

            mock_session = Mock()
            mock_session.get.side_effect = side_effect

            mock_session1 = Mock()
            mock_session1.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session1.__aexit__ = AsyncMock(return_value=None)

            mock_client_session.return_value = mock_session1
            provider = ADProvider()
            user_info = await provider.get_user_info(access_token='test_token')
            self.assertEqual(user_info['email'], 'test@test.com')
            self.assertEqual(user_info['username'], 'test@test.com')
            self.assertEqual(user_info['user_roles'], ['mage_role_1', 'mage_role_2'])
