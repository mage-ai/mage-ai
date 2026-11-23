from unittest import TestCase
from unittest.mock import MagicMock, patch

from mage_ai.services.aws.secrets_manager.secrets_manager import SecretsManager


class SecretsManagerTest(TestCase):
    @patch('mage_ai.services.aws.secrets_manager.secrets_manager.get_aws_boto3_client')
    def test_get_secret_string(self, mock_get_client):
        # With aws-secretsmanager-caching 1.1.1.5 on Python 3.12, the first read raised
        # "TypeError: 'float' object cannot be interpreted as an integer" in randint() (#6237).
        client = MagicMock()
        client.describe_secret.return_value = {
            'VersionIdsToStages': {'v1': ['AWSCURRENT']},
        }
        client.get_secret_value.return_value = {'SecretString': 's3cr3t', 'VersionId': 'v1'}
        mock_get_client.return_value = client

        self.assertEqual(SecretsManager().cache.get_secret_string('my-secret'), 's3cr3t')
