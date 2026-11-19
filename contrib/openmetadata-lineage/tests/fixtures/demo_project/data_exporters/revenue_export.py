from mage_ai.data_preparation.decorators import data_exporter
from mage_ai.io.postgres import Postgres
import pandas as pd


@data_exporter
def export_data(df: pd.DataFrame, *args, **kwargs) -> None:
    with Postgres.with_config(
        {
            'database': 'analytics',
            'schema': 'mart',
            'profile': 'default',
        }
    ) as exporter:
        exporter.export(
            df,
            'customer_revenue_export',
            if_exists='replace',
            index=False,
        )
