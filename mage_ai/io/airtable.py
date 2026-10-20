from typing import Union

import pandas as pd
import polars as pl
from pyairtable.api import Api

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey


class Airtable(BaseIO):
    """
    Handles data transfer between Airtable tables and the Mage app.
    """

    def __init__(
            self,
            token: str,
            verbose: bool = True,
            **kwargs) -> None:
        """
        Initializes a connection to Airtable.

        Args:
            token (str): Airtable API token.
            verbose (bool, optional): Whether to print verbose output. Defaults to True.
            **kwargs: Additional keyword arguments to pass to the pyairtable Api constructor.
        """
        super().__init__(verbose=verbose)
        self.client = Api(token, **kwargs)  # Create the Airtable API client

    @classmethod
    def with_config(
            cls,
            config: BaseConfigLoader
    ) -> 'Airtable':
        """
        Initializes an Airtable client from a configuration loader.

        Args:
            config (BaseConfigLoader): Configuration loader object.

        Raises:
            ValueError: If no valid Airtable API token is found in the configuration.

        Returns:
            Airtable: An instance of the Airtable class.
        """
        if ConfigKey.AIRTABLE_ACCESS_TOKEN not in config:
            raise ValueError(
                'No valid API token found for Airtable.'
                'You must specify your access token in your config.'
            )

        return cls(
            token=config[ConfigKey.AIRTABLE_ACCESS_TOKEN]
        )

    def load(
            self,
            base_id: str,
            table_name: str,
            **kwargs,
    ) -> pd.DataFrame:
        """
        Loads data from an Airtable table into a Pandas DataFrame.

        Args:
            base_id (str): The ID of the Airtable base (e.g., 'app*****').
            table_name (str): The name or ID of the Airtable table (e.g., 'tbl*****').
            **kwargs: Additional keyword arguments to pass to the pyairtable table.all() method.

        Returns:
            DataFrame: A Pandas DataFrame containing the data from the Airtable table.
        """
        with self.printer.print_msg(
                f'Loading data frame from table \'{table_name}\' at airtable app \'{base_id}\''
        ):
            table = self.client.table(base_id, table_name)  # Get the Airtable table
            data = table.all(**kwargs)  # Fetch all records from the table

            # Flatten the Airtable data structure into a list of dictionaries
            flattened_data = []
            for record in data:
                flattened_record = {
                    'id': record['id'],
                    'createdTime': record['createdTime']
                }
                fields = record['fields']
                flattened_record.update(fields)
                flattened_data.append(flattened_record)

            return pd.DataFrame(flattened_data)  # Create and return a DataFrame

    def export(
            self,
            df: Union[pd.DataFrame, pl.DataFrame],
            *args,
            **kwargs
    ) -> None:
        """
        Not implemented yet. This method is intended to export data to Airtable.
        """
        pass
