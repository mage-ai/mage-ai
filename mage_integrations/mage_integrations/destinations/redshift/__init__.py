from mage_integrations.connections.redshift import Redshift as RedshiftConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.redshift.utils import convert_column_type, convert_array
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_alter_table_command,
    build_create_table_command,
    build_insert_command,
    column_type_mapping as column_type_mapping_orig,
)
from mage_integrations.destinations.sql.utils import clean_column_name
from typing import Dict, List, Tuple


class Redshift(Destination):
    def build_connection(self) -> RedshiftConnection:
        return RedshiftConnection(
            access_key_id=self.config.get('access_key_id'),
            cluster_identifier=self.config.get('cluster_identifier'),
            database=self.config.get('database'),
            db_user=self.config.get('db_user'),
            host=self.config.get('host'),
            password=self.config.get('password'),
            port=self.config.get('port'),
            region=self.config.get('region'),
            secret_access_key=self.config.get('secret_access_key'),
            user=self.config.get('user'),
            verbose=1,
        )

    def build_create_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        """
        Uniqueness, primary key, and foreign key constraints are informational only;
        they are not enforced by Amazon Redshift.
        https://docs.aws.amazon.com/redshift/latest/dg/t_Defining_constraints.html
        """
        return [
            build_create_table_command(
                column_type_mapping=self.column_type_mapping(schema),
                columns=schema['properties'].keys(),
                full_table_name=f'{schema_name}.{table_name}',
                if_not_exists=True,
                unique_constraints=unique_constraints,
            ),
        ]

    def build_alter_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        results = self.build_connection().load(f"""
SELECT
    column_name
    , data_type
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{table_name}' AND TABLE_SCHEMA = '{schema_name}'
        """)
        current_columns = [r[0].lower() for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns if clean_column_name(c) not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=self.column_type_mapping(schema),
                columns=new_columns,
                full_table_name=f'{schema_name}.{table_name}',
            ),
        ]

    def build_insert_commands(
        self,
        records: List[Dict],
        schema: Dict,
        schema_name: str,
        table_name: str,
        database_name: str = None,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        full_table_name = self.full_table_name(schema_name, table_name)

        columns = list(schema['properties'].keys())
        insert_columns, insert_values = build_insert_command(
            column_type_mapping=self.column_type_mapping(schema),
            columns=columns,
            records=records,
            convert_array_func=self.convert_array,
            string_parse_func=self.string_parse_func,
        )
        insert_columns = ', '.join(insert_columns)
        insert_values = ', '.join(insert_values)

        commands = [
            '\n'.join([
                f'INSERT INTO {full_table_name} ({insert_columns})',
                f'VALUES {insert_values}',
            ]),
        ]

        # TODO: handle conflicts
        # MERGE command is in preview: https://docs.amazonaws.cn/en_us/redshift/latest/dg/r_MERGE.html

        if unique_constraints and UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
            full_table_name_temp = self.full_table_name(schema_name, table_name, prefix='temp_')
            full_table_name_old = self.full_table_name(schema_name, table_name, prefix='old_')
            drop_temp_table_command = f'DROP TABLE IF EXISTS {full_table_name_temp}'
            drop_old_table_command = f'DROP TABLE IF EXISTS {full_table_name_old}'
            unique_constraints_clean = [
                f'{clean_column_name(col)}'
                for col in unique_constraints
            ]
            commands = commands + [
                drop_temp_table_command,
                drop_old_table_command,
            ] + ['\n'.join([
                    f'CREATE TABLE {full_table_name_temp} AS '
                    f'SELECT {insert_columns} FROM ('
                    f'  SELECT *,'
                    f'      ROW_NUMBER() OVER ('
                    f'          PARTITION BY {", ".join(unique_constraints_clean)} ORDER BY _mage_created_at DESC'
                    f'      ) as row_num'
                    f'  FROM {full_table_name})'
                    f'WHERE row_num = 1'
                ])
            ] + [
                f'ALTER TABLE {full_table_name} rename to old_{table_name}',
                f'ALTER TABLE {full_table_name_temp} rename to {table_name}',
                drop_temp_table_command,
                drop_old_table_command,
            ]

        commands.append(
            '\n'.join([
                'WITH last_queryid_for_table AS (',
                '    SELECT query, MAX(si.starttime) OVER () as last_q_stime, si.starttime as stime',
                '    FROM stl_insert si, SVV_TABLE_INFO sti',
                f'    WHERE sti.table_id=si.tbl AND sti."table"=\'{table_name}\'',
                ')',
                'SELECT SUM(rows) FROM stl_insert si, last_queryid_for_table lqt ',
                'WHERE si.query=lqt.query AND lqt.last_q_stime=stime',
            ])
        )
        return commands

    def full_table_name(self, schema_name: str, table_name: str, prefix: str = '') -> str:
        return f'{schema_name}.{prefix}{table_name}'

    def column_type_mapping(self, schema: Dict) -> Dict:
        return column_type_mapping_orig(
            schema,
            convert_column_type,
            lambda item_type_converted: 'VARCHAR(65535)',
        )

    def convert_array(self, value: str, column_type_dict: Dict) -> str:
        return convert_array(value, column_type_dict)

    def string_parse_func(self, value: str, column_type_dict: Dict) -> str:
        if COLUMN_TYPE_OBJECT == column_type_dict['type']:
            return value.replace("'", "''")

        return value

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        connection = self.build_connection().build_connection()
        with connection.cursor() as cursor:
            cursor.execute(
                f'SELECT * FROM pg_tables WHERE schemaname = \'{schema_name}\' AND '
                f'tablename = \'{table_name}\'',
            )
            count = cursor.rowcount
            return count > 0

    def calculate_records_inserted_and_updated(
        self,
        data: List[List[Tuple]],
        unique_constraints: List[str] = None,
        unique_conflict_method: str = None,
    ) -> Tuple:
        records_inserted = 0
        for array_of_tuples in data:
            for t in array_of_tuples:
                if len(t) >= 1 and type(t[0]) is int:
                    records_inserted += t[0]

        return records_inserted, 0


if __name__ == '__main__':
    main(Redshift)
