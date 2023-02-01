from datetime import datetime, date

import singer
from singer import bookmarks as bks_, metadata

from .http import Client


class Context(object):
    """Represents a collection of global objects necessary for performing
    discovery or for running syncs. Notably, it contains
    - config  - The JSON structure from the config.json argument
    - state   - The mutable state dict that is shared among streams
    - client  - An HTTP client object for interacting with the API
    - catalog - A singer.catalog.Catalog. Note this will be None during
                discovery.
    """
    def __init__(self, config, state):
        self.config = config
        self.state = state
        self.client = Client(config)
        self._catalog = None
        self.selected_stream_ids = None
        self.now = datetime.utcnow()

    @property
    def catalog(self):
        return self._catalog

    @catalog.setter
    def catalog(self, catalog):
        self._catalog = catalog
        self.selected_stream_ids = set()
        for stream in catalog.streams:
            mdata = metadata.to_map(stream.metadata)
            root_metadata = mdata.get(())
            if root_metadata and root_metadata.get('selected') is True:
                self.selected_stream_ids.add(stream.tap_stream_id)

    def get_bookmark(self, path):
        return bks_.get_bookmark(self.state, *path)

    def set_bookmark(self, path, val):
        if isinstance(val, date):
            val = val.isoformat()
        bks_.write_bookmark(self.state, path[0], path[1], val)

    def get_offset(self, path):
        off = bks_.get_offset(self.state, path[0])
        return (off or {}).get(path[1])

    def set_offset(self, path, val):
        bks_.set_offset(self.state, path[0], path[1], val)

    def clear_offsets(self, tap_stream_id):
        bks_.clear_offset(self.state, tap_stream_id)

    def write_state(self):
        singer.write_state(self.state)
