from typing import List

from mage_integrations.connections.oracledb import OracleDB as OracleDBConnection
from mage_integrations.sources.base import main
from mage_integrations.sources.sql.base import Source


class OracleDB(Source):
    @property
    def host(self) -> str:
        return self.config['host']

    @property
    def port(self) -> str:
        return self.config['port']

    @property
    def service(self) -> str:
        return self.config['service']

    @property
    def user(self) -> str:
        return self.config['user']

    @property
    def password(self) -> str:
        return self.config['password']

    def _limit_query_string(self, limit, offset):
        return f'OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY'

    def build_discover_query(self, streams: List[str] = None):
        query = """
with selected_items as (
SELECT user_tab.TABLE_NAME,
user_tab.DATA_DEFAULT,
case cons.constraint_type
  when 'P' then 'PRI'
  when 'U' then 'UNIQUE'
  else cons.constraint_type
end as COLUMN_KEY,
user_tab.COLUMN_NAME,
user_tab.DATA_TYPE,
case user_tab.NULLABLE
  when 'N' then 'no'
  else'yes'
end as IS_NULLABLE,
row_number() OVER(
    PARTITION BY user_tab.TABLE_NAME, user_tab.COLUMN_NAME ORDER BY user_tab.DATA_TYPE) AS row_id
FROM user_tab_columns user_tab
LEFT JOIN all_cons_columns cols
ON cols.table_name = user_tab.table_name
AND cols.column_name = user_tab.column_name
LEFT JOIN all_constraints cons
ON cons.table_name = user_tab.table_name
AND cons.CONSTRAINT_NAME = cols.CONSTRAINT_NAME{where_table_clause}
)
select TABLE_NAME,
DATA_DEFAULT,
COLUMN_KEY,
COLUMN_NAME,
DATA_TYPE,
IS_NULLABLE
from selected_items where row_id = 1
        """
        if streams:
            table_names = ', '.join([f"'{n}'" for n in streams])
            query = query.format(where_table_clause=f"\nAND user_tab.TABLE_NAME IN ({table_names})")
        else:
            query = query.format(where_table_clause='')

        return query

    def build_connection(self) -> OracleDBConnection:
        return OracleDBConnection(
            host=self.host, password=self.password, user=self.user,
            port=self.port, service=self.service)

    def test_connection(self):
        conn = self.build_connection().build_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""SELECT name FROM v$database""")
        except Exception as exc:
            self.logger.error(f"test_connection exception: {exc}")
            raise exc
        return


if __name__ == '__main__':
    main(OracleDB)
