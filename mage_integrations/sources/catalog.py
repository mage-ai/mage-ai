from singer.catalog import Catalog as CatalogParent, CatalogEntry as CatalogEntryParent, Schema
from typing import List
import json


class CatalogEntry(CatalogEntryParent):
    def __init__(
        self,
        bookmark_properties: List[str] = None,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.bookmark_properties = bookmark_properties
        self.unique_conflict_method = unique_conflict_method
        self.unique_constraints = unique_constraints

    def to_dict(self):
        result = super().to_dict()

        if self.bookmark_properties:
            result['bookmark_properties'] = self.bookmark_properties
        if self.unique_conflict_method:
            result['unique_conflict_method'] = self.unique_conflict_method
        if self.unique_constraints:
            result['unique_constraints'] = self.unique_constraints

        return result


class Catalog(CatalogParent):
    @classmethod
    def load(cls, filename):
        with open(filename) as fp:  # pylint: disable=invalid-name
            return Catalog.from_dict(json.load(fp))

    @classmethod
    def from_dict(cls, data):
        # TODO: We may want to store streams as a dict where the key is a
        # tap_stream_id and the value is a CatalogEntry. This will allow
        # faster lookup based on tap_stream_id. This would be a breaking
        # change, since callers typically access the streams property
        # directly.
        streams = []
        for stream in data['streams']:
            entry = CatalogEntry()
            entry.bookmark_properties = stream.get('bookmark_properties')
            entry.database = stream.get('database_name')
            entry.is_view = stream.get('is_view')
            entry.key_properties = stream.get('key_properties')
            entry.metadata = stream.get('metadata')
            entry.replication_key = stream.get('replication_key')
            entry.replication_method = stream.get('replication_method')
            entry.schema = Schema.from_dict(stream.get('schema'))
            entry.stream = stream.get('stream')
            entry.stream_alias = stream.get('stream_alias')
            entry.table = stream.get('table_name')
            entry.tap_stream_id = stream.get('tap_stream_id')
            entry.unique_conflict_method = stream.get('unique_conflict_method')
            entry.unique_constraints = stream.get('unique_constraints')
            streams.append(entry)
        return Catalog(streams)
