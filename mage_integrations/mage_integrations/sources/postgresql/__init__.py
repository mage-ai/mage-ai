import datetime
import re
from select import select
from typing import Dict, Generator, List

import psycopg2
import psycopg2.extras
import singer

from mage_integrations.connections.postgresql import PostgreSQL as PostgreSQLConnection
from mage_integrations.destinations.constants import (
    DATETIME_COLUMN_SCHEMA,
    INTERNAL_COLUMN_DELETED_AT,
)
from mage_integrations.sources.base import main
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_FORMAT_UUID,
    REPLICATION_METHOD_FULL_TABLE,
    REPLICATION_METHOD_INCREMENTAL,
    REPLICATION_METHOD_LOG_BASED,
)
from mage_integrations.sources.messages import write_state
from mage_integrations.sources.postgresql.decoders import (
    Delete,
    Insert,
    Relation,
    Update,
    decode_message,
)
from mage_integrations.sources.sql.base import Source

INTERNAL_COLUMN_LSN = 'lsn'


class PostgreSQL(Source):
    @property
    def table_prefix(self):
        schema = self.config['schema']
        return f'"{schema}".'

    def build_table_name(self, stream) -> str:
        table_name = stream.tap_stream_id

        return f'{self.table_prefix}"{table_name}"'

    def build_connection(self, connection_factory=None) -> PostgreSQLConnection:
        connect_kwargs = dict(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port'),
            username=self.config['username'],
        )
        if connection_factory is not None:
            connect_kwargs['connection_factory'] = connection_factory
        return PostgreSQLConnection(
            **connect_kwargs,
        )

    def build_discover_query(self, streams: List[str] = None):
        schema = self.config['schema']

        query = f"""
SELECT
    c.table_name
    , c.column_default
    , tc.constraint_type AS column_key
    , c.column_name
    , c.data_type
    , c.is_nullable
FROM information_schema.columns c
LEFT JOIN information_schema.constraint_column_usage AS ccu
ON c.column_name = ccu.column_name
    AND c.table_name = ccu.table_name
    AND c.table_schema = ccu.table_schema
LEFT JOIN information_schema.table_constraints AS tc
ON tc.constraint_schema = ccu.constraint_schema
    AND tc.constraint_name = ccu.constraint_name
WHERE  c.table_schema = '{schema}'
        """

        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = f'{query}\nAND c.TABLE_NAME IN ({table_names})'
        return query

    def get_columns(self, table_name: str) -> List[str]:
        schema_name = self.config['schema']
        results = self.build_connection().load(f"""
SELECT
    column_name
    , data_type
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{table_name}' AND TABLE_SCHEMA = '{schema_name}'
        """)
        return [r[0].lower() for r in results]

    def internal_column_schema(self, stream, bookmarks: Dict = None) -> Dict[str, Dict]:
        if REPLICATION_METHOD_LOG_BASED == stream.replication_method:
            return {
                INTERNAL_COLUMN_DELETED_AT: DATETIME_COLUMN_SCHEMA,
                INTERNAL_COLUMN_LSN: {'type': ['integer']},
            }
        return dict()

    def update_column_names(self, columns: List[str]) -> List[str]:
        return list(map(lambda column: f'"{column}"', columns))

    def load_data_from_logs(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        if query is None:
            query = dict()
        tap_stream_id = stream.tap_stream_id
        bookmarks = bookmarks or dict()
        start_lsn = bookmarks.get(INTERNAL_COLUMN_LSN) or 0
        slot = self.config.get('replication_slot', 'mage_slot')

        # We are willing to poll for a total of 1 minute without finding a record
        poll_total_seconds = self.config.get('logical_poll_total_seconds') or 60 * 1
        keep_alive_time = 10.0
        begin_ts = datetime.datetime.now()

        postgres_connection = self.build_connection(
            connection_factory=psycopg2.extras.LogicalReplicationConnection,
        )
        connection = postgres_connection.build_connection()

        with connection.cursor() as cur:
            end_lsn = self.__get_current_lsn(cur)

            self.logger.info(
                f'Starting Logical Replication for {tap_stream_id}({slot}): {start_lsn} '
                f'-> {end_lsn}. poll_total_seconds: {poll_total_seconds}',
            )

            replication_params = dict(
                slot_name=slot,
                decode=False,
                start_lsn=start_lsn,
                options=dict(
                    proto_version='1',
                    publication_names=self.config.get('publication_name', 'mage_pub'),
                ),
            )

            try:
                cur.start_replication(**replication_params)
            except psycopg2.ProgrammingError:
                raise Exception(f'Unable to start replication with logical replication slot {slot}')

            columns = self.get_columns(tap_stream_id)
            # Map from relation id to relation name
            relations = dict()
            while True:
                poll_duration = (datetime.datetime.now() - begin_ts).total_seconds()
                if poll_duration > poll_total_seconds:
                    self.logger.info(f'Breaking after {poll_duration} seconds of '
                                     'polling with no data')
                    break

                msg = cur.read_message()
                if msg:
                    begin_ts = datetime.datetime.now()
                    if msg.data_start > end_lsn:
                        self.logger.info(f'Gone past end_lsn {end_lsn} for run. breaking')
                        break
                    decoded_payload = decode_message(msg.payload)

                    if type(decoded_payload) is Relation:
                        relations[decoded_payload.relation_id] = decoded_payload.relation_name

                    if msg.data_start < start_lsn:
                        self.logger.info(
                            f'Msg lsn {msg.data_start} smaller than start lsn {start_lsn}')
                        continue

                    if not type(decoded_payload) in [Delete, Insert, Update]:
                        continue

                    relation_name = relations.get(decoded_payload.relation_id)
                    # Skip if the relation name doesn't match the stream name
                    if not relation_name or relation_name != stream.tap_stream_id:
                        continue

                    if type(decoded_payload) in [Insert, Update]:
                        values = [c.col_data for c in decoded_payload.new_tuple.column_data]
                        payload = dict(zip(columns, values))
                        payload[INTERNAL_COLUMN_LSN] = msg.data_start
                        yield [payload]
                    elif type(decoded_payload) is Delete:
                        values = [c.col_data for c in decoded_payload.old_tuple.column_data]
                        payload = dict(zip(columns, values))
                        payload[INTERNAL_COLUMN_LSN] = msg.data_start
                        payload[INTERNAL_COLUMN_DELETED_AT] = \
                            datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')
                        yield [payload]
                    cur.send_feedback(flush_lsn=msg.data_start)
                else:
                    now = datetime.datetime.now()
                    timeout = keep_alive_time - (now - cur.io_timestamp).total_seconds()
                    try:
                        sel = select([cur], [], [], max(0, timeout))
                        if not any(sel):
                            self.logger.info(
                                f'No data for {timeout} seconds. sending feedback to server with NO'
                                ' flush_lsn. just a keep-alive')
                            cur.send_feedback()

                    except InterruptedError:
                        pass  # recalculate timeout and continue
        postgres_connection.close_connection(connection)

    def column_type_mapping(self, column_type: str, column_format: str = None) -> str:
        if COLUMN_FORMAT_DATETIME == column_format:
            return 'TIMESTAMP'
        elif COLUMN_FORMAT_UUID == column_format:
            return 'UUID'

        return super().column_type_mapping(column_type, column_format)

    def _after_load_data(self, stream):
        if REPLICATION_METHOD_LOG_BASED == stream.replication_method:
            # Write current lsn to db and bookmarks
            postgres_connection = self.build_connection(
                connection_factory=psycopg2.extras.LogicalReplicationConnection,
            )
            connection = postgres_connection.build_connection()

            with connection.cursor() as cur:
                current_lsn = self.__get_current_lsn(cur)

            state = singer.write_bookmark(
                {},
                stream.tap_stream_id,
                INTERNAL_COLUMN_LSN,
                current_lsn,
            )
            write_state(state)
            postgres_connection.close_connection(connection)

    def _get_bookmark_properties_for_stream(self, stream, bookmarks: Dict = None) -> List[str]:
        if REPLICATION_METHOD_LOG_BASED == self._replication_method(stream, bookmarks=bookmarks):
            return [INTERNAL_COLUMN_LSN]
        elif REPLICATION_METHOD_LOG_BASED == stream.replication_method:
            # Initial sync for LOG_BASED replication
            return self._get_replication_key(stream)
        else:
            return super()._get_bookmark_properties_for_stream(stream)

    def _replication_method(self, stream, bookmarks: Dict = None):
        if REPLICATION_METHOD_LOG_BASED != stream.replication_method:
            return stream.replication_method
        # Ues full table sync for the initial sync of log based replcation
        if not bookmarks or not bookmarks.get(INTERNAL_COLUMN_LSN):
            if self._get_replication_key(stream):
                # If bookmark columns are selected, use incremental sync as the initial sync
                return REPLICATION_METHOD_INCREMENTAL
            else:
                return REPLICATION_METHOD_FULL_TABLE

        return stream.replication_method

    def __get_current_lsn(self, cur):
        # Fetch current lsn
        version = self.__get_pg_version(cur)
        if version == 9:
            cur.execute("SELECT pg_current_xlog_location()")
        elif version > 9:
            cur.execute("SELECT pg_current_wal_lsn()")
        else:
            raise Exception('unable to fetch current lsn for PostgresQL version {}'.format(version))

        current_lsn = cur.fetchone()[0]
        if not current_lsn:
            return None

        file, index = current_lsn.split('/')
        current_lsn = (int(file, 16) << 32) + int(index, 16)
        return current_lsn

    def __get_pg_version(self, cur):
        cur.execute("SELECT version()")
        res = cur.fetchone()[0]
        version_match = re.match(r'PostgreSQL (\d+)', res)
        if not version_match:
            raise Exception('unable to determine PostgreSQL version from {}'.format(res))

        version = int(version_match.group(1))
        self.logger.info(f'Detected PostgresSQL version: {version}')
        return version


if __name__ == '__main__':
    main(PostgreSQL)
