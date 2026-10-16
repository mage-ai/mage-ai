from unittest.mock import MagicMock, patch

from mage_ai.tests.base_test import TestCase


class MongoDBDatabaseParsingTests(TestCase):
    """Tests for MongoDB database name extraction from connection strings."""

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_database_from_connection_string(self, mock_client):
        """Test database extracted from simple connection string."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(connection_string='mongodb://user:pass@host:27017/mydb')

        # Verify the correct database name was used
        mock_instance.__getitem__.assert_called_with('mydb')

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_database_from_connection_string_with_query_params(self, mock_client):
        """Test database extracted when connection string has query parameters."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(connection_string='mongodb://user:pass@host:27017/mydb?authSource=admin')

        mock_instance.__getitem__.assert_called_with('mydb')

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_database_url_encoded(self, mock_client):
        """Test URL-encoded database name is properly decoded."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(connection_string='mongodb://user:pass@host:27017/my%20database')

        mock_instance.__getitem__.assert_called_with('my database')

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_explicit_database_takes_precedence(self, mock_client):
        """Test explicit database parameter overrides connection string."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(
            connection_string='mongodb://user:pass@host:27017/db_in_uri',
            database='explicit_db',
        )

        mock_instance.__getitem__.assert_called_with('explicit_db')

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_missing_database_raises_exception(self, mock_client):
        """Test that missing database raises clear exception."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        with self.assertRaises(Exception) as context:
            MongoDB(connection_string='mongodb://user:pass@host:27017/')

        self.assertIn('Database name must be provided', str(context.exception))

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_missing_database_no_path_raises_exception(self, mock_client):
        """Test that connection string without path raises exception."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        with self.assertRaises(Exception) as context:
            MongoDB(connection_string='mongodb://user:pass@host:27017')

        self.assertIn('Database name must be provided', str(context.exception))

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_mongodb_srv_scheme(self, mock_client):
        """Test mongodb+srv:// scheme works correctly."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(
            connection_string='mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true',
        )

        mock_instance.__getitem__.assert_called_with('mydb')

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_nested_path_uses_first_segment(self, mock_client):
        """Test that nested paths like /db/collection only use first segment."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(connection_string='mongodb://user:pass@host:27017/mydb/somecollection')

        mock_instance.__getitem__.assert_called_with('mydb')

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_database_with_special_characters(self, mock_client):
        """Test database name with special characters."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(connection_string='mongodb://user:pass@host:27017/my-db_123')

        mock_instance.__getitem__.assert_called_with('my-db_123')

    @patch('mage_ai.io.mongodb.MongoClient')
    def test_host_password_user_port_without_connection_string(self, mock_client):
        """Test initialization with individual parameters instead of connection string."""
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance

        from mage_ai.io.mongodb import MongoDB
        MongoDB(
            host='localhost',
            port=27017,
            user='testuser',
            password='testpass',
            database='testdb',
        )

        mock_instance.__getitem__.assert_called_with('testdb')
        mock_client.assert_called_once_with('mongodb://testuser:testpass@localhost:27017/')
