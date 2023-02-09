import os
import json
import singer
from singer import metadata
from .sync import STREAM_CONFIGS
from singer.catalog import Schema
from mage_integrations.sources.catalog import Catalog, CatalogEntry


def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)


def get_schemas():
    schemas = {}
    schemas_metadata = {}
    schemas_path = get_abs_path('schemas')

    file_names = [f for f in os.listdir(schemas_path)
                  if os.path.isfile(os.path.join(schemas_path, f))]

    for file_name in file_names:
        stream_name = file_name[:-5]
        with open(os.path.join(schemas_path, file_name)) as data_file:
            schema = json.load(data_file)

        refs = schema.pop("definitions", {})
        if refs:
            singer.resolve_schema_references(schema, refs)

        replication = STREAM_CONFIGS[stream_name]['replication']
        meta = metadata.get_standard_metadata(
            schema=schema,
            key_properties=['id'],
            replication_method='FULL_TABLE' if replication == 'full' else replication.upper()
        )

        meta = metadata.to_map(meta)

        if replication == 'incremental':
            meta = metadata.write(
                meta,
                ('properties', STREAM_CONFIGS[stream_name]['filter_field']),
                'inclusion',
                'automatic',
            )

        meta = metadata.to_list(meta)

        schemas[stream_name] = schema
        schemas_metadata[stream_name] = meta

    return schemas, schemas_metadata


def discover():
    schemas, field_metadata = get_schemas()
    catalog = Catalog([])

    for stream_name, schema_dict in schemas.items():
        schema = Schema.from_dict(schema_dict)
        metadata = field_metadata[stream_name]

        settings = STREAM_CONFIGS[stream_name]

        bookmark_properties = None
        if 'filter_field' in settings:
            bookmark_properties = settings['filter_field']
            if type(bookmark_properties) is not list:
                bookmark_properties = [bookmark_properties]

        replication_method = None
        if 'replication' in settings:
            replication_method = settings['replication'].upper()

        catalog_entry = CatalogEntry(
            bookmark_properties=bookmark_properties,
            key_properties=['id'],
            metadata=metadata,
            replication_method=replication_method,
            schema=schema,
            stream=stream_name,
            tap_stream_id=stream_name,
        )
        catalog.streams.append(catalog_entry)

    return catalog
