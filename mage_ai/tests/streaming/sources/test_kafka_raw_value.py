from unittest import TestCase
from unittest.mock import MagicMock, patch
import json

from mage_ai.streaming.sources.kafka import KafkaSource
from mage_ai.streaming.sources.shared import SerializationMethod


class KafkaRawValueTests(TestCase):
    @patch('mage_ai.streaming.sources.kafka.KafkaConsumer')
    def test_kafka_raw_value_key_handling(self, mock_kafka):
        # Create a mock message with non-UTF8 key
        mock_message = MagicMock()
        mock_message.key = b'\xff\x83\x00'  # Invalid UTF-8 bytes
        mock_message.value = b'test_value'
        mock_message.partition = 1
        mock_message.offset = 100
        mock_message.timestamp = 1234567890
        mock_message.topic = 'test_topic'

        # Configure source with RAW_VALUE
        config = {
            'bootstrap_server': 'dummy',
            'consumer_group': 'test',
            'topic': 'test_topic',
            'include_metadata': True,
            'serde_config': {
                'serialization_method': SerializationMethod.RAW_VALUE
            }
        }
        
        source = KafkaSource(config)
        
        # Test message conversion
        result = source._convert_message(mock_message)
        
        self.assertIsInstance(result, dict)
        self.assertIn('metadata', result)
        self.assertIn('key', result['metadata'])
        # With RAW_VALUE, key should remain as bytes
        self.assertEqual(result['metadata']['key'], b'\xff\x83\x00')
        self.assertEqual(result['data'], b'test_value')

    @patch('mage_ai.streaming.sources.kafka.KafkaConsumer')
    def test_kafka_utf8_key_handling(self, mock_kafka):
        # Create a mock message with UTF-8 key
        mock_message = MagicMock()
        mock_message.key = 'test_key'.encode('utf-8')
        mock_message.value = json.dumps({'value': 'test_value'}).encode('utf-8')
        mock_message.partition = 1
        mock_message.offset = 100
        mock_message.timestamp = 1234567890
        mock_message.topic = 'test_topic'

        # Configure source without RAW_VALUE
        config = {
            'bootstrap_server': 'dummy',
            'consumer_group': 'test',
            'topic': 'test_topic',
            'include_metadata': True
        }
        
        source = KafkaSource(config)
        
        # Test message conversion
        result = source._convert_message(mock_message)
        
        self.assertIsInstance(result, dict)
        self.assertIn('metadata', result)
        self.assertIn('key', result['metadata'])
        # Without RAW_VALUE, key should be decoded to string
        self.assertEqual(result['metadata']['key'], 'test_key')
        self.assertIsInstance(result['data'], dict)
        self.assertEqual(result['data']['value'], 'test_value')

    @patch('mage_ai.streaming.sources.kafka.KafkaConsumer')
    def test_kafka_non_utf8_key_without_raw_value(self, mock_kafka):
        # Create a mock message with non-UTF8 key but without RAW_VALUE
        mock_message = MagicMock()
        mock_message.key = b'\xff\x83\x00'  # Invalid UTF-8 bytes
        mock_message.value = json.dumps({'value': 'test_value'}).encode('utf-8')
        mock_message.partition = 1
        mock_message.offset = 100
        mock_message.timestamp = 1234567890
        mock_message.topic = 'test_topic'

        # Configure source without RAW_VALUE
        config = {
            'bootstrap_server': 'dummy',
            'consumer_group': 'test',
            'topic': 'test_topic',
            'include_metadata': True
        }
        
        source = KafkaSource(config)
        
        # Test message conversion - should fallback to raw bytes
        result = source._convert_message(mock_message)
        
        self.assertIsInstance(result, dict)
        self.assertIn('metadata', result)
        self.assertIn('key', result['metadata'])
        # Should fallback to raw bytes when decode fails
        self.assertEqual(result['metadata']['key'], b'\xff\x83\x00')
        self.assertIsInstance(result['data'], dict)
