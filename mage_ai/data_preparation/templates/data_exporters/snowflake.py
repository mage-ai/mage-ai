from mage_ai.io.snowflake import Snowflake
from pandas import DataFrame


@data_exporter
def export_data_to_snowflake(df: DataFrame) -> None:
    """
    Template code for exporting data to a table in a Snowflake warehouse
    """
    table_name = 'your_table_name'
    config = {
        'user': 'your_snowflake_username',
        'password': 'your_snowflake_password',
        'account': 'your_snowflake_account_identifier',
    }

    with Snowflake(**config) as loader:
        return loader.export(
            df,
            table_name,
            if_exists='replace',  # Specify resolution policy if table name already exists
        )
