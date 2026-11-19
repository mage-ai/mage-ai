if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter

from mage_ai.io.config import ConfigFileLoader
from mage_ai.io.postgres import Postgres
from mage_ai.settings.repo import get_repo_path
from os import path
import pandas as pd


@data_exporter
def export_data(df: pd.DataFrame, *args, **kwargs) -> None:
    config_path = path.join(get_repo_path(), 'io_config.yaml')
    with Postgres.with_config(ConfigFileLoader(config_path, 'default')) as exporter:
        exporter.export(
            df,
            schema_name='mart',
            table_name='manual_category_revenue_export',
            if_exists='replace',
            index=False,
        )
