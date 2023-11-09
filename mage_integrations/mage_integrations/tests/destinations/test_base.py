import io
import unittest
from abc import ABC, abstractmethod
from typing import Dict, List
from unittest.mock import MagicMock, patch

from mage_integrations.destinations.base import Destination

SAMPLE_RECORD = {
    'id': 2,
    'first_name': 'jason',
    'last_name': 'scott',
    'age': 18,
    'color': 'red',
    'morphed': 1,
    'date_joined': '1993-08-28T00:00:00',
    'power_level': 99.99,
}
SAMPLE_RECORD_ROW = {
    'type': 'RECORD',
    'stream': 'demo_users',
    'record': SAMPLE_RECORD,
}
SAMPLE_SCHEMA = {
    'properties': {
        'id': {'type': ['null', 'string']},
        'first_name': {'type': ['null', 'string']},
        'last_name': {'type': ['null', 'string']},
        'age': {'type': ['null', 'integer']},
        'color': {'type': ['null', 'string']},
        'morphed': {'type': ['integer']},
        'date_joined': {'format': 'date-time', 'type': ['string']},
        'power_level': {'type': ['null', 'number']},
    },
    'type': 'object',
}
SAMPLE_SCHEMA_ROW = {
    'type': 'SCHEMA',
    'stream': 'demo_users',
    'schema': SAMPLE_SCHEMA,
    'key_properties': ['id'],
    'replication_method': 'INCREMENTAL',
    'unique_conflict_method': 'UPDATE',
    'unique_constraints': ['id'],
}
SAMPLE_STREAM_NAME = 'demo_users'


class MockDestination(Destination):
    def export_batch_data(self, record_data: List[Dict], stream: str, tags: Dict = None) -> None:
        pass

    def test_connection(self) -> None:
        pass


def build_test_destination():
    destination = MockDestination(
        config=dict(database='demo_db'),
    )
    destination.disable_column_type_check = dict(demo_users=True)
    destination.bookmark_properties = {}
    destination.key_properties = {}
    destination.partition_keys = {}
    destination.replication_methods = {}
    destination.schemas = {}
    destination.unique_conflict_methods = {}
    destination.unique_constraints = {}
    destination.validators = {}
    destination.versions = {}

    return destination


class BaseDestinationTests(ABC):
    """
    Base unit tests that will be applied to all subclasses.
    """
    @abstractmethod
    def test_templates(self):
        pass

    @abstractmethod
    def test_test_connection(self):
        pass


class DestinationTests(unittest.TestCase):
    """
    Unit tests for the common methods in the base destination.
    """
    def test_process_record(self):
        destination = build_test_destination()
        with patch.object(destination, 'export_data') as mock_export_data:
            destination.process_record(
                row=SAMPLE_RECORD_ROW,
                schema=SAMPLE_SCHEMA,
                stream=SAMPLE_STREAM_NAME,
            )
            mock_export_data.assert_called_once_with(
                record=SAMPLE_RECORD,
                schema=SAMPLE_SCHEMA,
                stream=SAMPLE_STREAM_NAME,
                tags={},
            )

    def test_process_record_data(self):
        destination = build_test_destination()
        with patch.object(destination, 'export_batch_data') as mock_export_batch_data:
            record_data = [
                dict(
                    row=SAMPLE_RECORD_ROW,
                    schema=SAMPLE_SCHEMA,
                    stream=SAMPLE_STREAM_NAME,
                )
            ]
            destination.process_record_data(
                record_data=record_data,
                stream=SAMPLE_STREAM_NAME,
            )
            mock_export_batch_data.assert_called_once_with(
                [dict(record=SAMPLE_RECORD, stream=SAMPLE_STREAM_NAME)],
                SAMPLE_STREAM_NAME,
                tags={'records': 1, 'stream': 'demo_users'},
            )

    def test_process_empty_record_data(self):
        destination = build_test_destination()
        with patch.object(destination, 'export_batch_data') as mock_export_batch_data:
            destination.process_record_data(
                record_data=[],
                stream=SAMPLE_STREAM_NAME,
            )
            mock_export_batch_data.assert_not_called()

    def test_process_schema(self):
        destination = build_test_destination()
        destination.process_schema(
            stream=SAMPLE_STREAM_NAME,
            schema=SAMPLE_SCHEMA,
            row=SAMPLE_SCHEMA_ROW,
        )
        self.assertEqual(
            destination.schemas,
            {
                'demo_users': {
                    'properties': {
                        'id': {'type': ['null', 'string']},
                        'first_name': {'type': ['null', 'string']},
                        'last_name': {'type': ['null', 'string']},
                        'age': {'type': ['null', 'integer']},
                        'color': {'type': ['null', 'string']},
                        'morphed': {'type': ['integer']},
                        'date_joined': {'format': 'date-time', 'type': ['string']},
                        'power_level': {'type': ['null', 'number']},
                        '_mage_created_at': {'format': 'date-time', 'type': ['null', 'string']},
                        '_mage_updated_at': {'format': 'date-time', 'type': ['null', 'string']},
                    },
                    'type': 'object',
                }
            },
        )
        self.assertEqual(
            destination.key_properties,
            {'demo_users': ['id']},
        )
        self.assertEqual(
            destination.unique_constraints,
            {'demo_users': ['id']},
        )

    def test_process_state(self):
        destination = build_test_destination()
        with patch.object(destination, '_emit_state') as mock_emit_state:
            destination.process_state(
                row=dict(value='test')
            )
            mock_emit_state.assert_called_once_with('test')

    def test_process_no_state(self):
        destination = build_test_destination()
        with self.assertRaises(Exception) as context:
            destination.process_state(
                row=SAMPLE_RECORD_ROW
            )
            self.assertEqual(
                str(context.exception), 'A state message is missing a state value.')

    def test_process_test_connection(self):
        destination = build_test_destination()
        destination.should_test_connection = True
        destination.before_process = MagicMock()
        destination.after_process = MagicMock()
        with patch.object(destination, 'test_connection') as mock_test_connection:
            with patch.object(destination, '_process') as mock_process:
                destination.process(None)
                mock_test_connection.assert_called_once()
                mock_process.assert_not_called()
                destination.before_process.assert_called_once()
                destination.after_process.assert_called_once()

    def test_process(self):
        destination = build_test_destination()
        destination.before_process = MagicMock()
        destination.after_process = MagicMock()
        with patch.object(destination, '_process') as mock_process:
            input_buffer = io.StringIO('mock_input_buffer')
            destination.process(input_buffer)
            mock_process.assert_called_once_with(input_buffer)
            destination.before_process.assert_called_once()
            destination.after_process.assert_called_once()
