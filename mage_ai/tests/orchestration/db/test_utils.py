from unittest import TestCase

from mage_ai.orchestration.db.utils import get_user_info_from_db_connection_url


class DBUtilsTest(TestCase):
    def test_parse_db_connection_url(self):
        url = 'postgresql+psycopg2://postgres:passw0rd@postgres-db:5432/postgres'
        username, password = get_user_info_from_db_connection_url(url)

        self.assertEqual(username, 'postgres')
        self.assertEqual(password, 'passw0rd')

    def test_parse_db_connection_url_symbols(self):
        url = 'postgresql+psycopg2://postgres:&^*@%@%*%^^$$*#^*^#@$&$#^##%&%#&%@%^*!@*^@!%@postgres-db:5432/postgres'  # noqa: E501
        username, password = get_user_info_from_db_connection_url(url)

        self.assertEqual(username, 'postgres')
        self.assertEqual(password, '&^*@%@%*%^^$$*#^*^#@$&$#^##%&%#&%@%^*!@*^@!%')
