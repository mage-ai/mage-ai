import logging
from typing import List

from algoliasearch.search_client import SearchClient
from pandas import DataFrame

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey

LOGGER = logging.getLogger(__name__)


class Algolia(BaseIO):
    def __init__(
            self,
            app_id: str,
            api_key: str,
            index_name: str,
            verbose: bool = True,
            **kwargs,) -> None:
        """
        Initializes connection to algolia.
        """
        super().__init__(verbose=verbose)
        self.client = SearchClient.create(app_id, api_key)
        self.index_name = index_name

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Algolia':
        return cls(
            app_id=config[ConfigKey.ALGOLIA_APP_ID],
            api_key=config[ConfigKey.ALGOLIA_API_KEY],
            index_name=config[ConfigKey.ALGOLIA_INDEX_NAME],
        )

    def load(
        self,
        query_texts: str,
        index_name: str = None,
        column_names: List = None,
        **kwargs,
    ) -> DataFrame:
        """
        Loads the data from Algolia with query_texts.

        Args:
            query_texts (str): Texts to query.
            index_name (str): Name of the index. Defaults to the name defined in io_config.yaml.
            column_names (List): columns to fetch.
        Returns:
            DataFrame: Data frame object loaded.
        """
        index_name = index_name or self.index_name
        index = self.client.init_index(index_name)
        try:
            if column_names:
                res = index.search(query_texts, {
                    'attributesToRetrieve': column_names,
                })
            else:
                res = index.search(query_texts)
        except Exception as e:
            LOGGER.error(f'Error when querying algolia: {e}')
            return
        flatten_data = {}
        for column in column_names:
            flatten_data[column] = [x[column] for x in res['hits']]
        return DataFrame.from_dict(flatten_data)

    def export(
        self,
        df: DataFrame,
        index_name: str = None,
        **kwargs,
    ) -> None:
        """
        Write  data into Algolia.

        Args:
            df (DataFrame): dataframes to write.
            index_name (str): Name of the index. Defaults to the name defined in io_config.yaml.
        """
        index_name = index_name or self.index_name
        index = self.client.init_index(index_name)

        data_objs = df.to_dict('records')
        try:
            index.save_objects(data_objs, {
                'autoGenerateObjectIDIfNotExist': True
            })
        except Exception as e:
            LOGGER.error(f'Error when exporting data to algolia: {e}')
