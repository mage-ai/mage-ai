import unittest

from mage_ai.io.mongodb import extract_db_name_from_uri


class TestExtractDbNameFromUri(unittest.TestCase):
    """Tests for the extract_db_name_from_uri function."""

    def test_basic_uri_with_database(self):
        """Test extraction from a standard MongoDB URI with database name."""
        uri = 'mongodb://user:password@localhost:27017/my_database'
        self.assertEqual(extract_db_name_from_uri(uri), 'my_database')

    def test_uri_without_database(self):
        """Test URI without database returns None."""
        uri = 'mongodb://user:password@localhost:27017/'
        self.assertIsNone(extract_db_name_from_uri(uri))

    def test_uri_without_trailing_slash(self):
        """Test URI without trailing slash and no database returns None."""
        uri = 'mongodb://user:password@localhost:27017'
        self.assertIsNone(extract_db_name_from_uri(uri))

    def test_url_encoded_database_name(self):
        """Test URL-encoded database names are properly decoded."""
        uri = 'mongodb://user:password@localhost:27017/my%20database'
        self.assertEqual(extract_db_name_from_uri(uri), 'my database')

    def test_url_encoded_special_characters(self):
        """Test URL-encoded special characters are properly decoded."""
        uri = 'mongodb://user:password@localhost:27017/test%2Fdb%3Fname'
        self.assertEqual(extract_db_name_from_uri(uri), 'test/db?name')

    def test_nested_path_returns_first_segment(self):
        """Test that nested paths return only the first segment."""
        uri = 'mongodb://user:password@localhost:27017/my_database/extra/path'
        self.assertEqual(extract_db_name_from_uri(uri), 'my_database')

    def test_uri_with_options(self):
        """Test URI with query options still extracts database correctly."""
        uri = 'mongodb://user:password@localhost:27017/my_database?retryWrites=true'
        self.assertEqual(extract_db_name_from_uri(uri), 'my_database')

    def test_mongodb_srv_uri(self):
        """Test mongodb+srv:// connection string format."""
        uri = 'mongodb+srv://user:password@cluster.mongodb.net/prod_db'
        self.assertEqual(extract_db_name_from_uri(uri), 'prod_db')

    def test_none_connection_string(self):
        """Test None connection string returns None."""
        self.assertIsNone(extract_db_name_from_uri(None))

    def test_empty_connection_string(self):
        """Test empty connection string returns None."""
        self.assertIsNone(extract_db_name_from_uri(''))

    def test_replica_set_uri(self):
        """Test URI with replica set hosts."""
        uri = 'mongodb://user:pass@host1:27017,host2:27017,host3:27017/mydb?replicaSet=rs0'
        self.assertEqual(extract_db_name_from_uri(uri), 'mydb')


if __name__ == '__main__':
    unittest.main()
