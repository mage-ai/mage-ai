from datetime import datetime
from freezegun import freeze_time
from mage_ai.api.operations import constants
from mage_ai.authentication.oauth2 import encode_token
from mage_ai.orchestration.db.models import Oauth2AccessToken
from mage_ai.tests.api.operations.base import BaseApiTestCase
from mage_ai.tests.factory import create_user


class SessionOperationTests(BaseApiTestCase):
    @freeze_time(datetime(3333, 12, 12))
    def test_execute_create(self):
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
        response = operation.execute()

        access_token = Oauth2AccessToken.query.filter(Oauth2AccessToken.user_id == user.id).first()

        self.assertEqual(
            response['session']['token'],
            encode_token(access_token.token, access_token.expires),
        )

    def test_execute_create_failed(self):
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
        response = operation.execute()

        self.assertIsNotNone(response['error'])
