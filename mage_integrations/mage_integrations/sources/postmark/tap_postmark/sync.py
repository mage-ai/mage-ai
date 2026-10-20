"""Sync data."""
# -*- coding: utf-8 -*-
import logging
from datetime import datetime, timezone
from typing import Callable, Optional

import singer
from singer.catalog import Catalog, CatalogEntry

from mage_integrations.sources.messages import write_schema
from mage_integrations.sources.postmark.tap_postmark import tools
from mage_integrations.sources.postmark.tap_postmark.postmark import Postmark
from mage_integrations.sources.postmark.tap_postmark.streams import STREAMS

LOGGER: logging.RootLogger = singer.get_logger()


def sync(
    postmark: Postmark,
    state: dict,
    catalog: Catalog,
    start_date: str,
    logger=None,
) -> None:
    """Sync data from tap source.

    Arguments:
        postmark {Postmark} -- Postmark client
        state {dict} -- Tap state
        catalog {Catalog} -- Stream catalog
        start_date {str} -- Start date
    """
    logger = logger or LOGGER
    # For every stream in the catalog
    logger.info('Sync')
    logger.debug('Current state:\n{state}')

    # Only selected streams are synced, whether a stream is selected is
    # determined by whether the key-value: "selected": true is in the schema
    # file.
    for stream in catalog.get_selected_streams(state):
        logger.info(f'Syncing stream: {stream.tap_stream_id}')

        # Update the current stream as active syncing in the state
        singer.set_currently_syncing(state, stream.tap_stream_id)

        # Retrieve the state of the stream
        stream_state: dict = tools.get_stream_state(
            state,
            stream.tap_stream_id,
        ) or dict(start_date=start_date)

        logger.debug(f'Stream state: {stream_state}')

        # Write the schema
        write_schema(
            stream_name=stream.tap_stream_id,
            schema=stream.schema.to_dict(),
            key_properties=stream.key_properties,
            bookmark_properties=stream.bookmark_properties,
            disable_column_type_check=stream.disable_column_type_check,
            partition_keys=stream.partition_keys,
            replication_method=stream.replication_method,
            stream_alias=stream.stream_alias,
            unique_conflict_method=stream.unique_conflict_method,
            unique_constraints=stream.unique_constraints,
        )

        # Every stream has a corresponding method in the PayPal object e.g.:
        # The stream: paypal_transactions will call: paypal.paypal_transactions
        tap_data: Callable = getattr(postmark, stream.tap_stream_id)

        # The tap_data method yields rows of data from the API
        # The state of the stream is used as kwargs for the method
        # E.g. if the state of the stream has a key 'start_date', it will be
        # used in the method as start_date='2021-01-01T00:00:00+0000'
        for row in tap_data(**stream_state):
            sync_record(stream, row, state)


def sync_record(stream: CatalogEntry, row: dict, state: dict) -> None:
    """Sync the record.

    Arguments:
        stream {CatalogEntry} -- Stream catalog
        row {dict} -- Record
        state {dict} -- State
    """
    # Retrieve the value of the bookmark
    bookmark_property = None
    if stream.bookmark_properties:
        bookmark_property = stream.bookmark_properties[0]
    else:
        bookmark_property = stream.replication_key

    bookmark: Optional[str] = tools.retrieve_bookmark_with_path(
        bookmark_property,
        row,
    )

    # Create new bookmark
    new_bookmark: str = tools.create_bookmark(stream.tap_stream_id, bookmark)

    # Write a row to the stream
    singer.write_record(
        stream.tap_stream_id,
        row,
        time_extracted=datetime.now(timezone.utc),
    )

    if new_bookmark:
        # Save the bookmark to the state
        singer.write_bookmark(
            state,
            stream.tap_stream_id,
            STREAMS[stream.tap_stream_id]['bookmark'],
            new_bookmark,
        )

        # Clear currently syncing
        tools.clear_currently_syncing(state)

        # Write the bootmark
        singer.write_state(state)
