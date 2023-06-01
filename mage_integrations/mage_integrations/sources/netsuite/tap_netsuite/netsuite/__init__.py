#!/usr/bin/env python3
from .netsuite_connection import ExtendedNetSuiteConnection
import os
import singer
from typing import Dict
import singer.utils as singer_utils
from singer import metadata, metrics
from tap_netsuite.netsuite.soap import Soap

LOGGER = singer.get_logger()


def _get_abs_path(path: str) -> str:
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def _load_object_definitions() -> Dict:
    """Loads a JSON schema file for a given
    NetSuite Report resource into a dict representation.
    """
    schema_path = _get_abs_path("schemas")
    return singer.utils.load_json(f"{schema_path}/object_definition.json")


NS_OBJECT_DEFINITIONS = _load_object_definitions()
NS_OBJECTS = NS_OBJECT_DEFINITIONS.keys()


def field_to_property_schema(field):  # pylint:disable=too-many-branches

    number_type = {
        "type": [
            "null",
            "number"
        ]
    }

    string_type = {
        "type": [
            "string",
            "null"
        ]
    }

    boolean_type = {
        "type": [
            "boolean",
            "null"
        ]
    }

    datetime_type = {
        "anyOf": [
            {
                "type": "string",
                "format": "date-time"
            },
            string_type
        ]
    }

    object_type = {
        "type": [
            "null",
            "object"
        ]
    }

    array_type = {
        "type": "array"
    }

    ns_types = {
        "number": number_type,
        "string": string_type,
        "datetime": datetime_type,
        "object": object_type,
        "array": array_type,
        "boolean": boolean_type,
        "object_reference": string_type,
        "email": string_type,
        "address": string_type,
        "metadata": string_type
    }

    ns_type = field['type']
    property_schema = ns_types[ns_type]

    return property_schema


class NetSuite:

    def __init__(self,
                 ns_account=None,
                 ns_consumer_key=None,
                 ns_consumer_secret=None,
                 ns_token_key=None,
                 ns_token_secret=None,
                 fetch_child=None,
                 is_sandbox=True,
                 select_fields_by_default=None,
                 default_start_date=None):

        self.ns_account = ns_account
        self.ns_consumer_key = ns_consumer_key
        self.ns_consumer_secret = ns_consumer_secret
        self.ns_token_key = ns_token_key
        self.ns_token_secret = ns_token_secret
        self.ns_fetch_child = fetch_child
        self.is_sandbox = is_sandbox
        self.select_fields_by_default = select_fields_by_default is True or (
                isinstance(select_fields_by_default, str) and select_fields_by_default.lower() == 'true')

        self.default_start_date = default_start_date

        if ns_account is not None:
            if is_sandbox is True:
                self.ns_account = self.ns_account + '_SB1'

        self.ns_client = None

        # validate start_date
        if default_start_date is not None:
            singer_utils.strptime(default_start_date)

    def describe(self, sobject=None):
        """Describes all objects or a specific object"""
        if sobject is None:
            return NS_OBJECTS
        else:
            return NS_OBJECT_DEFINITIONS[sobject]

    def connect_tba(self, caching=True):
        nc = ExtendedNetSuiteConnection(
            account=self.ns_account,
            consumer_key=self.ns_consumer_key,
            consumer_secret=self.ns_consumer_secret,
            token_key=self.ns_token_key,
            token_secret=self.ns_token_secret,
            fetch_child=self.ns_fetch_child,
            caching=caching
        )
        self.ns_client = nc

    def get_start_date(self, state, catalog_entry):
        catalog_metadata = metadata.to_map(catalog_entry['metadata'])
        replication_key = catalog_metadata.get((), {}).get('replication-key')

        return (singer.get_bookmark(state,
                                    catalog_entry['tap_stream_id'],
                                    replication_key) or self.default_start_date)

    def query(self, ns, catalog_entry, state):
        soap = Soap(ns)
        return soap.query(catalog_entry, state)
