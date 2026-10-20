class RawDeltaTable():
    def __init__(self, raw_delta_table):
        self._table = raw_delta_table
        self.schema = self._table.schema
        self.version = self._table.version

    def table_uri(self):
        return self._table.table_uri()

    def protocol_versions(self):
        return self._table.protocol_versions()

    def create_write_transaction(self, *args, **kwargs):
        self._table.create_write_transaction(*args, **kwargs)
