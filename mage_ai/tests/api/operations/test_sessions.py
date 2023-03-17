from datetime import datetime
from freezegun import freeze_time
from mage_ai.api.operations import constants
from mage_ai.authentication.oauth2 import encode_token
from mage_ai.authentication.ldap import LDAPConnection
from mage_ai.orchestration.db.models.oauth import User, Oauth2AccessToken
from mage_ai.tests.api.operations.base import BaseApiTestCase
from mage_ai.tests.factory import create_user
from unittest.mock import patch


class SessionOperationTests(BaseApiTestCase):
    @freeze_time(datetime(3333, 12, 12))
    async def test_execute_create(self):
        password = 'password'
        user = create_user(password=password)

        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(session=dict(
                email=user.email,
                password=password,
            )),
            resource='sessions',
        )
        response = await operation.execute()

        access_token = Oauth2AccessToken.query.filter(Oauth2AccessToken.user_id == user.id).first()

        self.assertEqual(
            response['session']['token'],
            encode_token(access_token.token, access_token.expires),
        )

    async def test_execute_create_failed(self):
        password = 'password'
        user = create_user(password=password)

        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(session=dict(
                email=user.email,
                password='not password',
            )),
            resource='sessions',
        )
        response = await operation.execute()

        self.assertIsNotNone(response['error'])

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_login(self, mock_authenticate, mock_authorize):
        mock_authenticate.return_value = (True, "Julius_Novachrono")
        mock_authorize.return_value = True

        username = "novachrono"
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(session=dict(
                email=username,
                password="Wizard King",
            )),
            resource='sessions',
        )
        await operation.execute()

        mock_authenticate.assert_called_once_with("novachrono", "Wizard King")
        mock_authorize.assert_called_once_with("Julius_Novachrono")
        self.assertIsNotNone(User.query.filter(User.username == username).first())

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_login_unauthenticated(self, mock_authenticate, mock_authorize):
        mock_authenticate.return_value = (False, "")
        mock_authorize.return_value = False

        username = "licht"
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(session=dict(
                email=username,
                password="Golden Dawn",
            )),
            resource='sessions',
        )
        response = await operation.execute()

        mock_authenticate.assert_called_once_with("licht", "Golden Dawn")
        mock_authorize.assert_not_called()
        self.assertIsNone(User.query.filter(User.username == username).first())
        self.assertIsNotNone(response['error'])

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_login_unauthorized(self, mock_authenticate, mock_authorize):
        mock_authenticate.return_value = (True, "Yami_Sukehiro")
        mock_authorize.return_value = False

        username = "yami"
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(session=dict(
                email=username,
                password="black bull",
            )),
            resource='sessions',
        )
        response = await operation.execute()

        mock_authenticate.assert_called_once_with("yami", "black bull")
        mock_authorize.assert_called_once_with("Yami_Sukehiro")
        self.assertIsNone(User.query.filter(User.username == username).first())
        self.assertIsNotNone(response['error'])
