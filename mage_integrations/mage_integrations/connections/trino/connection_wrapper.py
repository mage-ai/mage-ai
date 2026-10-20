from trino.dbapi import Connection, Cursor as CursorParent
from trino.transaction import IsolationLevel


class Cursor(CursorParent):
    def __enter__(self):
        return self

    def __exit__(self, *args, **kwargs):
        pass


class ConnectionWrapper(Connection):
    def cursor(self, legacy_primitive_types: bool = None):
        """Return a new :py:class:`Cursor` object using the connection."""
        if self.isolation_level != IsolationLevel.AUTOCOMMIT:
            if self.transaction is None:
                self.start_transaction()
        if self.transaction is not None:
            request = self.transaction.request
        else:
            request = self._create_request()
        return Cursor(
            self,
            request,
            # if legacy_primitive_types is not explicitly set in Cursor, take from Connection
            legacy_primitive_types if legacy_primitive_types is not None else self.legacy_primitive_types
        )
