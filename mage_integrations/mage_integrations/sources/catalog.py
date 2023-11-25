import json
from typing import Dict, List

from singer import catalog

from mage_integrations.sources.constants import METADATA_KEY_SELECTED


class CatalogEntry(catalog.CatalogEntry):
    def __init__(
        self,
        auto_add_new_fields: bool = False,
        bookmark_properties: List[str] = None,
        bookmark_property_operators: Dict = None,
        disable_column_type_check: bool = None,
        partition_keys: List[str] = None,
        run_in_parallel: bool = False,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.auto_add_new_fields = False
        self.bookmark_properties = bookmark_properties
        self.bookmark_property_operators = bookmark_property_operators
        self.disable_column_type_check = disable_column_type_check
        self.partition_keys = partition_keys
        self.run_in_parallel = run_in_parallel
        self.unique_conflict_method = unique_conflict_method
        self.unique_constraints = unique_constraints

    def to_dict(self):
        result = super().to_dict()

        if self.auto_add_new_fields is not None:
            result['auto_add_new_fields'] = self.auto_add_new_fields
        if self.bookmark_properties:
            result['bookmark_properties'] = self.bookmark_properties
        if self.disable_column_type_check is not None:
            result['disable_column_type_check'] = self.disable_column_type_check
        if self.partition_keys:
            result['partition_keys'] = self.partition_keys
        if self.run_in_parallel:
            result['run_in_parallel'] = self.run_in_parallel
        if self.unique_conflict_method:
            result['unique_conflict_method'] = self.unique_conflict_method
        if self.unique_constraints:
            result['unique_constraints'] = self.unique_constraints

        return result

    def update_schema(self, new_catalog_entry: 'CatalogEntry'):
        """
        Add new fields from new_catalog_entry to catalog_entry
        """

        metadata_by_col = dict()
        if type(new_catalog_entry) is dict:
            new_catalog_entry = Catalog.from_dict(dict(streams=[new_catalog_entry])).streams[0]
        for d in new_catalog_entry.metadata:
            breadcrumb = d.get('breadcrumb')
            if not breadcrumb:
                continue
            if len(breadcrumb) == 2 and breadcrumb[0] == 'properties':
                metadata_by_col[breadcrumb[1]] = d
        for col, col_property in new_catalog_entry.schema.properties.items():
            if col not in self.schema.properties:
                self.schema.properties[col] = col_property
                if col in metadata_by_col:
                    col_metadata = metadata_by_col[col]
                    col_metadata['metadata'][METADATA_KEY_SELECTED] = True
                    self.metadata.append(col_metadata)
        return self


class Catalog(catalog.Catalog):
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
            entry.auto_add_new_fields = stream.get('auto_add_new_fields')
            entry.bookmark_properties = stream.get('bookmark_properties')
            entry.bookmark_property_operators = stream.get('bookmark_property_operators')
            entry.database = stream.get('database_name')
            entry.disable_column_type_check = stream.get('disable_column_type_check')
            entry.is_view = stream.get('is_view')
            entry.key_properties = stream.get('key_properties')
            entry.metadata = stream.get('metadata')
            entry.partition_keys = stream.get('partition_keys')
            entry.replication_key = stream.get('replication_key')
            entry.replication_method = stream.get('replication_method')
            entry.run_in_parallel = stream.get('run_in_parallel')
            entry.schema = catalog.Schema.from_dict(stream.get('schema'))
            entry.stream = stream.get('stream')
            entry.stream_alias = stream.get('stream_alias')
            entry.table = stream.get('table_name')
            entry.tap_stream_id = stream.get('tap_stream_id')
            entry.unique_conflict_method = stream.get('unique_conflict_method')
            entry.unique_constraints = stream.get('unique_constraints')
            streams.append(entry)
        return Catalog(streams)

    def to_dict(self):
        arr = []
        for stream in self.streams:
            arr.append(stream if type(stream) is dict else stream.to_dict())

        return dict(streams=arr)

    def get_stream(self, tap_stream_id):
        for stream in self.streams:
            if stream.tap_stream_id == tap_stream_id:
                return stream
        return None
