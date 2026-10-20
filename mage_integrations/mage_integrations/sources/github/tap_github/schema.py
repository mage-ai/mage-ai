import json
import os

import singer
from singer import metadata

from mage_integrations.sources.github.tap_github.streams import STREAMS


def get_abs_path(path):
    """
    Get the absolute path for the schema files.
    """
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def load_schema_references():
    """
    Load the schema files from the schema folder and return the schema references.
    """
    shared_schema_path = get_abs_path("schemas/shared")

    shared_file_names = [
        f
        for f in os.listdir(shared_schema_path)
        if os.path.isfile(os.path.join(shared_schema_path, f))
    ]

    refs = {}
    for shared_schema_file in shared_file_names:
        with open(os.path.join(shared_schema_path, shared_schema_file)) as data_file:
            refs["shared/" + shared_schema_file] = json.load(data_file)

    return refs


def get_schemas():
    """
    Load the schema references, prepare metadata for each streams and return schema and metadata
    for the catalog.
    """
    schemas = {}
    field_metadata = {}

    refs = load_schema_references()
    for stream_name, stream_metadata in STREAMS.items():
        schema_path = get_abs_path("schemas/{}.json".format(stream_name))

        with open(schema_path) as file:
            schema = json.load(file)

        schemas[stream_name] = schema
        schema = singer.resolve_schema_references(schema, refs)

        mdata = metadata.new()
        mdata = metadata.get_standard_metadata(
            schema=schema,
            key_properties=(hasattr(stream_metadata, "key_properties") or None)
            and stream_metadata.key_properties,
            valid_replication_keys=(
                hasattr(stream_metadata, "replication_keys") or None
            )
            and stream_metadata.replication_keys,
            replication_method=(hasattr(stream_metadata, "replication_method") or None)
            and stream_metadata.replication_method,
        )
        mdata = metadata.to_map(mdata)

        # Loop through all keys and make replication keys and primary keys of child stream which
        # are not automatic in parent stream of automatic inclusion
        for field_name in schema["properties"].keys():
            pk_child_fields = (
                hasattr(stream_metadata, "pk_child_fields") or None
            ) and stream_metadata.pk_child_fields
            replication_keys = (
                hasattr(stream_metadata, "replication_keys") or None
            ) and stream_metadata.replication_keys
            if (replication_keys and field_name in replication_keys) or (
                pk_child_fields and field_name in pk_child_fields
            ):
                mdata = metadata.write(
                    mdata, ("properties", field_name), "inclusion", "automatic"
                )

        mdata = metadata.to_list(mdata)
        field_metadata[stream_name] = mdata

    return schemas, field_metadata
