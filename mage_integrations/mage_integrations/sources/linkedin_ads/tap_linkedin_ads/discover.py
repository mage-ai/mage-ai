from mage_integrations.sources.catalog import Catalog, CatalogEntry
from singer.catalog import Schema
from tap_linkedin_ads.schema import get_schemas, STREAMS

def discover():
    schemas, field_metadata = get_schemas()
    catalog = Catalog([])

    for stream_name, schema_dict in schemas.items():
        schema = Schema.from_dict(schema_dict)
        mdata = field_metadata[stream_name]

        settings = STREAMS[stream_name]
        catalog_entry = CatalogEntry(
            bookmark_properties=settings['replication_keys'],
            key_properties=settings['key_properties'],
            metadata=mdata,
            replication_method=settings['replication_method'],
            schema=schema,
            stream=stream_name,
            tap_stream_id=stream_name,
        )
        catalog.streams.append(catalog_entry)

    return catalog
