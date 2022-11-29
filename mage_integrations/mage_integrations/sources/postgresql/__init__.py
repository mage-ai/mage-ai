from mage_integrations.connections.postgresql import PostgreSQL as PostgreSQLConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    REPLICATION_METHOD_LOG_BASED,
)
from mage_integrations.sources.postgresql.decoders import (
    Insert,
    Relation,
    decode_message
)
from mage_integrations.sources.sql.base import Source
from select import select
from typing import Dict, Generator, List
import datetime
import psycopg2
import psycopg2.extras
import re
import singer

LOGGER = singer.get_logger()


class PostgreSQL(Source):
    @property
    def table_prefix(self):
        schema = self.config['schema']
        return f'{schema}.'

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

    def update_column_names(self, columns: List[str]) -> List[str]:
        return list(map(lambda column: f'"{column}"', columns))

    def load_data_from_logs(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = dict(),
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        tap_stream_id = stream.tap_stream_id
        bookmarks = bookmarks or dict()
        start_lsn = bookmarks.get('lsn') or 0
        slot = 'mage_slot'

        # We are willing to poll for a total of 1 minute without finding a record
        poll_total_seconds = self.config.get('logical_poll_total_seconds') or 60 * 1
        keep_alive_time = 10.0
        begin_ts = datetime.datetime.now()

        postgres_connection = self.build_connection(
            connection_factory=psycopg2.extras.LogicalReplicationConnection,
        )
        connection = postgres_connection.build_connection()

        with connection.cursor() as cur:
            # Fetch current lsn
            version = self.__get_pg_version(cur)
            if version == 9:
                cur.execute("SELECT pg_current_xlog_location()")
            elif version > 9:
                cur.execute("SELECT pg_current_wal_lsn()")
            else:
                raise Exception('unable to fetch current lsn for PostgresQL version {}'.format(version))

            current_lsn = cur.fetchone()[0]
            file, index = current_lsn.split('/')
            end_lsn = (int(file, 16) << 32) + int(index, 16)

            LOGGER.info(
                'Starting Logical Replication for %s(%s): %s -> %s. poll_total_seconds: %s',
                tap_stream_id,
                slot,
                start_lsn,
                end_lsn,
                poll_total_seconds,
            )

            replication_params = dict(
                slot_name=slot,
                decode=False,
                start_lsn=start_lsn,
                options=dict(
                    proto_version='1',
                    publication_names='mage_pub',
                ),
            )

            try:
                cur.start_replication(**replication_params)
            except psycopg2.ProgrammingError:
                raise Exception("unable to start replication with logical replication slot {}".format(slot))

            # Relation id to schema mapping
            relations = dict()
            while True:
                poll_duration = (datetime.datetime.now() - begin_ts).total_seconds()
                if poll_duration > poll_total_seconds:
                    LOGGER.info("breaking after %s seconds of polling with no data", poll_duration)
                    break

                msg = cur.read_message()
                if msg:
                    begin_ts = datetime.datetime.now()
                    if msg.data_start > end_lsn:
                        LOGGER.info("gone past end_lsn %s for run. breaking", end_lsn)
                        break

                    decoded_payload = decode_message(msg.payload)
                    if type(decoded_payload) is Relation:
                        relations[decoded_payload.relation_id] = dict(
                            schema=decoded_payload.namespace,
                            name=decoded_payload.relation_name,
                            columns=[c[1] for c in decoded_payload.columns]
                        )
                    elif type(decoded_payload) is Insert:
                        values = [c.col_data for c in decoded_payload.new_tuple.column_data]
                        if decoded_payload.relation_id in relations:
                            relation = relations[decoded_payload.relation_id]
                            if (
                                relation['schema'] == self.config['schema'] and
                                relation['name'] == tap_stream_id
                            ):
                                payload = dict(zip(relation['columns'], values))
                                yield [payload]
                else:
                    now = datetime.datetime.now()
                    timeout = keep_alive_time - (now - cur.io_timestamp).total_seconds()
                    try:
                        sel = select([cur], [], [], max(0, timeout))
                        if not any(sel):
                            LOGGER.info(
                                "no data for %s seconds. sending feedback to server with NO "
                                "flush_lsn. just a keep-alive", timeout)
                            cur.send_feedback()

                    except InterruptedError:
                        pass  # recalculate timeout and continue
        postgres_connection.close_connection(connection)

    def column_type_mapping(self, column_type: str, column_format: str = None) -> str:
        if COLUMN_FORMAT_DATETIME == column_format:
            return 'TIMESTAMP'

        return super().column_type_mapping(column_type, column_format)

    def _get_bookmark_properties_for_stream(self, stream) -> List[str]:
        if REPLICATION_METHOD_LOG_BASED == stream.replication_method:
            return 'lsn'
        else:
            return super()._get_bookmark_properties_for_stream(stream)

    def __get_pg_version(self, cur):
        cur.execute("SELECT version()")
        res = cur.fetchone()[0]
        version_match = re.match('PostgreSQL (\d+)', res)
        if not version_match:
            raise Exception('unable to determine PostgreSQL version from {}'.format(res))

        version = int(version_match.group(1))
        LOGGER.info("Detected PostgresSQL version: %s", version)
        return version


if __name__ == '__main__':
    main(PostgreSQL)
