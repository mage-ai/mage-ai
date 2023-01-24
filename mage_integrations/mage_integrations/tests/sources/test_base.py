from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.base import Source
from mage_integrations.sources.intercom import Intercom
from mage_integrations.sources.postgresql import PostgreSQL
from mage_integrations.sources.stripe import Stripe
from singer.schema import Schema
from unittest.mock import patch
import unittest
import json
import sys

def build_sample_streams_catalog_entries():
    return [
        CatalogEntry(
            stream='demo_table',
            tap_stream_id='demo_table',
        ),
        CatalogEntry(
            stream='demo_users',
            tap_stream_id='demo_users',
        ),
    ]

def build_sample_streams_list():
    stream1 = dict(
        auto_add_new_fields=False,
        bookmark_properties=None,
        database=None,
        disable_column_type_check=None,
        is_view=None,
        key_properties=[],
        metadata=[
            {
                'breadcrumb': (),
                'metadata': {
                    'table-key-properties': [],
                    'forced-replication-method': 'FULL_TABLE',
                    'valid-replication-keys': [],
                    'inclusion': 'available',
                    'schema-name': 'demo_table',
                },
            },
            {
                'breadcrumb': ('properties', 'confidence'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'actionname'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'type'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'isdeleted'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'actionid'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'createdbyid'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'systemmodstamp'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'lastmodifieddate'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'createddate'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'id'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'name'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'airecordinsightid'),
                'metadata': {'inclusion': 'available'},
            },
            {
                'breadcrumb': ('properties', 'lastmodifiedbyid'),
                'metadata': {'inclusion': 'available'},
            },
        ],
        partition_keys=None,
        replication_key=None,
        replication_method='FULL_TABLE',
        row_count=None,
        schema=dict(
            additionalProperties=None,
            anyOf=None,
            description=None,
            exclusiveMaximum=None,
            exclusiveMinimum=None,
            format=None,
            inclusion=None,
            items=None,
            maximum=None,
            maxLength=None,
            minimum=None,
            minLength=None,
            multipleOf=None,
            patternProperties=None,
            properties=dict(
                confidence=dict(
                    type=['null', 'integer'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                actionname=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                type=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                isdeleted=dict(
                    type=['null', 'boolean'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                actionid=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                createdbyid=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                systemmodstamp=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                lastmodifieddate=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                createddate=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format='date-time',
                    additionalProperties=None,
                    patternProperties=None,
                ),
                id=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                name=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                airecordinsightid=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
                lastmodifiedbyid=dict(
                    type=['null', 'string'],
                    properties=None,
                    items=None,
                    selected=None,
                    inclusion=None,
                    description=None,
                    minimum=None,
                    maximum=None,
                    exclusiveMinimum=None,
                    exclusiveMaximum=None,
                    multipleOf=None,
                    maxLength=None,
                    minLength=None,
                    anyOf=None,
                    format=None,
                    additionalProperties=None,
                    patternProperties=None,
                ),
            ),
            selected=None,
            type='object',
        ),
        stream_alias=None,
        stream='demo_table',
        table=None,
        tap_stream_id='demo_table',
        unique_conflict_method='UPDATE',
        unique_constraints=[],
    )
    stream2 = dict(
        auto_add_new_fields=False,
        bookmark_properties=['id'],
        key_properties=[],
        metadata=[
            {
                'breadcrumb': [],
                'metadata': {
                    'table-key-properties': [],
                    'forced-replication-method': 'FULL_TABLE',
                    'valid-replication-keys': [],
                    'inclusion': 'available',
                    'schema-name': 'demo_users'
                }
            },
            {
                'breadcrumb': [
                    'properties',
                    'age'
                ],
                'metadata': {
                    'inclusion': 'available',
                    'selected': True,
                }
            },
            {
                'breadcrumb': [
                    'properties',
                    'id'
                ],
                'metadata': {
                    'inclusion': 'available',
                    'selected': True,
                }
            },
            {
                'breadcrumb': [
                    'properties',
                    'last_name'
                ],
                'metadata': {
                    'inclusion': 'available',
                    'selected': True,
                }
            },
            {
                'breadcrumb': [
                    'properties',
                    'first_name'
                ],
                'metadata': {
                    'inclusion': 'available',
                    'selected': True,
                }
            },
            {
                'breadcrumb': [
                    'properties',
                    'color'
                ],
                'metadata': {
                    'inclusion': 'available',
                    'selected': True,
                }
            },
        ],
        replication_method='INCREMENTAL',
        schema=dict(
            properties=dict(
                age=dict(type=['null', 'integer']),
                id=dict(type=['null', 'string']),
                last_name=dict(type=['null', 'string']),
                first_name=dict(type=['null', 'string']),
                color=dict(type=['null', 'string'])
            ),
            type='object',
        ),
        stream='demo_users',
        tap_stream_id='demo_users',
        unique_conflict_method='UPDATE',
    )

    return [stream1, stream2]

def build_sample_streams_catalog():
    return Catalog.from_dict(
        dict(streams=build_sample_streams_list())
    )

class BaseSourceTests(unittest.TestCase):
    maxDiff = None

    def test_templates(self):
        # Template folders exist in the different integration source folders.
        source = PostgreSQL()
        templates = source.templates()
        self.assertEqual(
            templates,
            {
                'config': {
                    'database': '',
                    'host': '',
                    'password': '',
                    'port': 5432,
                    'schema': '',
                    'username': '',
                    'replication_slot': '',
                }
            },
        )

    def test_discover(self):
        # Testing with Intercom source, since it has a "schemas" folder and no "discover" subclass method.
        source = Intercom()
        streams = source.discover().streams
        self.assertEqual(len(streams), 11)

    def test_discover_streams(self):
        source = Source()
        with patch.object(source, 'get_stream_ids', return_value=['demo_table', 'demo_users']):
            streams = source.discover_streams()
            self.assertEqual(
                streams,
                [
                    dict(
                        stream='demo_table',
                        tap_stream_id='demo_table',
                    ),
                    dict(
                        stream='demo_users',
                        tap_stream_id='demo_users',
                    ),
                ],
            )

    def test_get_stream_ids(self):
        source = Source()
        with patch.object(source, 'discover', return_value=build_sample_streams_catalog()):
            stream_ids = source.get_stream_ids()
            self.assertEqual(stream_ids, ['demo_table', 'demo_users'])

    def test_process_execute_test_connection(self):
        source = Source(
            test_connection=True,
        )
        with patch.object(source, 'test_connection') as mock_test_connection:
            source.process()
            mock_test_connection.assert_called_once()

    def test_process_load_sample_data(self):
        catalog = build_sample_streams_catalog()
        source = Source(
            catalog=catalog,
            load_sample_data=True,
            selected_streams=['demo_table', 'demo_users'],
        )
        with patch.object(source, 'load_data', return_value=None) as mock_load_data:
            source.process()
            self.assertEqual(mock_load_data.call_count, 2)

    def test_process_discover_streams_mode(self):
        source = Source(
            discover_mode=True,
            discover_streams_mode=True,
        )
        with patch.object(source, 'discover_streams') as mock_discover_streams:
            with patch.object(json, 'dump') as mock_json_dump:
                source.process()
                mock_discover_streams.assert_called_once()
                mock_json_dump.assert_called_once()

    def test_process_discover_mode(self):
        source = Source(
            discover_mode=True,
        )
        with patch.object(source, 'discover') as mock_discover:
            source.process()
            mock_discover.assert_called_once()

    def test_process_count_records_mode(self):
        catalog = build_sample_streams_catalog()
        source = Source(
            catalog=catalog,
            count_records=True,
            selected_streams=['demo_table', 'demo_users'],
        )
        with patch.object(source, 'count_records') as mock_count_records:
            with patch.object(catalog, 'get_selected_streams', return_value=build_sample_streams_catalog_entries()):
                with patch.object(json, 'dump'):
                    source.process()
                    self.assertEqual(mock_count_records.call_count, 2)

    def test_process(self):
        source1 = Source()
        with patch.object(source1, 'discover') as mock_discover:
            source1.process()
            mock_discover.assert_called_once()

        catalog = build_sample_streams_catalog()
        source2 = Source(
            catalog=catalog,
        )
        with patch.object(source2, 'sync') as mock_sync:
            source2.process()
            mock_sync.assert_called_with(catalog)

    def test_process_stream(self):
        source = Source()
        with self.assertRaises(Exception):
            source.process_stream(
                CatalogEntry(
                    replication_method='INVALID_METHOD',
                    stream='demo_table',
                    tap_stream_id='demo_table',
                ),
            )
        with patch.object(sys.stdout, 'write') as mock_write:
            with patch.object(sys.stdout, 'flush') as mock_flush:
                source.process_stream(
                    build_sample_streams_catalog().streams[0],
                )
                mock_write.assert_called_once()
                mock_flush.assert_called_once()

    def test_sync_stream(self):
        source = Source(
            config=dict(start_date='2023-01-01'),
        )
        stream = CatalogEntry(
            replication_method='FULL_TABLE',
            stream='demo_users',
            tap_stream_id='demo_users',
        )
        with patch.object(
            source,
            '_get_bookmark_properties_for_stream',
            return_value=['id']
        ) as mock_get_bookmark_props:
            with patch.object(source, 'load_data') as mock_load_data:
                source.sync_stream(stream)
                mock_get_bookmark_props.assert_called_with(stream)
                mock_load_data.assert_called_once() 

    def test_write_records(self):
        source = Source(
            is_sorted=True,
        )
        stream = build_sample_streams_catalog().streams[1]
        with patch.object(
            source,
            '_get_bookmark_properties_for_stream',
            return_value=['id'],
        ) as mock_get_bookmark_props:
            result = source.write_records(
                stream,
                [
                    dict(
                        age=18,
                        color='red',
                        first_name='jason',
                        id=2,
                        last_name='scott',
                    )
                ],
            )
            mock_get_bookmark_props.assert_called_once()
            self.assertEqual(
                result,
                dict(
                    final_record={
                        'age': 18,
                        'id': 2,
                        'last_name': 'scott',
                        'first_name': 'jason',
                        'color': 'red'
                    },
                    max_bookmark=[],
                ),
            )

    def test_sync(self):
        catalog = build_sample_streams_catalog()
        source = Source()
        with patch.object(source, 'process_stream') as mock_process_stream:
            with patch.object(source, 'sync_stream') as mock_sync_stream:
                with patch.object(catalog, 'get_selected_streams', return_value=build_sample_streams_catalog_entries()):
                    source.sync(catalog)
                    self.assertEqual(mock_process_stream.call_count, 2)
                    self.assertEqual(mock_sync_stream.call_count, 2)

    def test_build_catalog_entry(self):
        source = Source()
        catalog_entry = source.build_catalog_entry(
            'demo_users',
            Schema(
                properties=dict(
                    age=Schema(type=['null', 'integer']),
                    id=Schema(type=['null', 'string']),
                    last_name=Schema(type=['null', 'string']),
                    first_name=Schema(type=['null', 'string']),
                    color=Schema(type=['null', 'string'])
                ),
                type='object',
            ),
        )
        self.assertEqual(
            catalog_entry.to_dict(),
            {
                "auto_add_new_fields": False,
                "key_properties": [],
                "metadata": [
                    {
                        "breadcrumb": (),
                        "metadata": {
                            "forced-replication-method": "FULL_TABLE",
                            "inclusion": "available",
                            "schema-name": "demo_users",
                            "selected": False,
                            "table-key-properties": [],
                            "valid-replication-keys": [],
                        },
                    },
                    {
                        "breadcrumb": ("properties", "age"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "id"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "last_name"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "first_name"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "color"),
                        "metadata": {"inclusion": "available"},
                    },
                ],
                "replication_key": "",
                "replication_method": "FULL_TABLE",
                "schema": {
                    "properties": {
                        "age": {"type": ["null", "integer"]},
                        "color": {"type": ["null", "string"]},
                        "first_name": {"type": ["null", "string"]},
                        "id": {"type": ["null", "string"]},
                        "last_name": {"type": ["null", "string"]},
                    },
                    "type": "object",
                },
                "stream": "demo_users",
                "tap_stream_id": "demo_users",
            },
        )
    
    def test_load_schemas_from_folder(self):
        # Testing with Stripe source, since not all of the integration sources have "schemas" folders.
        source = Stripe()
        schemas = source.load_schemas_from_folder()
        self.assertEqual(
            list(schemas),
            [
                'balance_transactions',
                'charges',
                'coupons',
                'customers',
                'disputes',
                'events',
                'invoice_items',
                'invoice_line_items',
                'invoices',
                'payment_intents',
                'payout_transactions',
                'payouts',
                'plans',
                'products',
                'subscription_items',
                'subscriptions',
                'transfers',
            ],
        )