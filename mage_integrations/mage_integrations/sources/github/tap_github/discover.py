import singer
from singer.catalog import Catalog, CatalogEntry, Schema

from mage_integrations.sources.github.tap_github.schema import get_schemas

LOGGER = singer.get_logger()


def discover(client, logger=None):
    """
    Run the discovery mode, prepare the catalog file and return catalog.
    """
    logger_to_use = logger or LOGGER
    # Check credential in the discover mode.
    client.verify_access_for_repo()

    schemas, field_metadata = get_schemas()
    catalog = Catalog([])

    for stream_name, schema_dict in schemas.items():
        try:
            schema = Schema.from_dict(schema_dict)
            mdata = field_metadata[stream_name]
        except Exception as err:
            logger_to_use.error(err)
            logger_to_use.error("stream_name: %s", stream_name)
            logger_to_use.error("type schema_dict: %s", type(schema_dict))
            raise err

        key_properties = mdata[0]["metadata"].get("table-key-properties")
        catalog.streams.append(
            CatalogEntry(
                stream=stream_name,
                tap_stream_id=stream_name,
                key_properties=key_properties,
                schema=schema,
                metadata=mdata,
            )
        )

    return catalog.to_dict()
