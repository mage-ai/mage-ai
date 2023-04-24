from singer.catalog import Catalog, CatalogEntry, Schema
from .schema import get_schemas
import singer

LOGGER = singer.get_logger()


def discover(reports, logger=LOGGER):
    schemas, field_metadata = get_schemas(reports, logger=logger)
    catalog = Catalog([])

    for stream_name, schema_dict in schemas.items():
        schema = Schema.from_dict(schema_dict)
        mdata = field_metadata[stream_name]

        table_metadata = {}
        for entry in mdata:
            if entry.get('breadcrumb') == ():
                table_metadata = entry.get('metadata', {})
        key_properties = table_metadata.get('table-key-properties')

        catalog.streams.append(CatalogEntry(
            stream=stream_name,
            tap_stream_id=stream_name,
            key_properties=key_properties,
            schema=schema,
            metadata=mdata
        ))

    return catalog
