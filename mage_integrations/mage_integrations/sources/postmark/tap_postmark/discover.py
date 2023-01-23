"""Discover."""
# -*- coding: utf-8 -*-
from singer import metadata
from singer.catalog import Catalog, CatalogEntry
from tap_postmark.schema import load_schemas
from tap_postmark.streams import STREAMS


def discover() -> Catalog:  # noqa: WPS210
    """Load the Stream catalog.

    Returns:
        Catalog -- The catalog
    """
    raw_schemas: dict = load_schemas()
    streams: list = []

    # Parse every schema
    for stream_id, schema in raw_schemas.items():

        stream_meta: dict = STREAMS[stream_id]
        # Create metadata
        mdata: list = metadata.get_standard_metadata(
            schema=schema.to_dict(),
            key_properties=stream_meta.get('key_properties', None),
            valid_replication_keys=stream_meta.get(
                'replication_keys',
                None,
            ),
            replication_method=stream_meta.get(
                'replication_method',
                None,
            ),
        )

        # Create a catalog entry
        streams.append(
            CatalogEntry(
                tap_stream_id=stream_id,
                stream=stream_id,
                schema=schema,
                key_properties=stream_meta.get('key_properties', None),
                metadata=mdata,
                replication_key=stream_meta.get(
                    'replication_key',
                    None,
                ),
                replication_method=stream_meta.get(
                    'replication_method',
                    None,
                ),
            ),
        )
    return Catalog(streams)
