import unittest
from urllib.parse import unquote, urlparse


def extract_database_from_uri(connection_string: str) -> str:
    """
    Extract database name from MongoDB connection string.
    This mirrors the logic in mage_ai.io.mongodb.MongoDB.__init__
    """
    parsed = urlparse(connection_string)
    if parsed.path and len(parsed.path) > 1:
        path = parsed.path.strip('/')
        return unquote(path.split('/')[0]) if path else None
    return None


class MongoDBDatabaseParsingTests(unittest.TestCase):
    """Tests for MongoDB database name extraction from connection strings."""

    def test_database_from_connection_string(self):
        """Test database extracted from simple connection string."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017/mydb')
        self.assertEqual(result, 'mydb')

    def test_database_from_connection_string_with_query_params(self):
        """Test database extracted when connection string has query parameters."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017/mydb?authSource=admin')
        self.assertEqual(result, 'mydb')

    def test_database_url_encoded(self):
        """Test URL-encoded database name is properly decoded."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017/my%20database')
        self.assertEqual(result, 'my database')

    def test_mongodb_srv_scheme(self):
        """Test mongodb+srv:// scheme works correctly."""
        result = extract_database_from_uri(
            'mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true'
        )
        self.assertEqual(result, 'mydb')

    def test_nested_path_uses_first_segment(self):
        """Test that nested paths like /db/collection only use first segment."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017/mydb/somecollection')
        self.assertEqual(result, 'mydb')

    def test_database_with_special_characters(self):
        """Test database name with special characters."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017/my-db_123')
        self.assertEqual(result, 'my-db_123')

    def test_missing_database_trailing_slash(self):
        """Test that trailing slash returns None."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017/')
        self.assertIsNone(result)

    def test_missing_database_no_path(self):
        """Test that connection string without path returns None."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017')
        self.assertIsNone(result)

    def test_url_encoded_special_chars(self):
        """Test URL-encoded special characters are decoded."""
        result = extract_database_from_uri('mongodb://user:pass@host:27017/test%2Fdb')
        self.assertEqual(result, 'test/db')

    def test_complex_srv_uri(self):
        """Test complex mongodb+srv URI with multiple query params."""
        result = extract_database_from_uri(
            'mongodb+srv://user:p%40ssword@cluster0.abc123.mongodb.net/production'
            '?retryWrites=true&w=majority&authSource=admin'
        )
        self.assertEqual(result, 'production')


if __name__ == '__main__':
    unittest.main()
