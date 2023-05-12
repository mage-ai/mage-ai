from typing import Dict, List, Union

from pandas import DataFrame
from pymongo import MongoClient

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey


class MongoDB(BaseIO):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        user: str,
        collection: str = None,
        port: int = 3306,
        verbose: bool = True,
        **kwargs,
    ) -> None:
        super().__init__(verbose=verbose)
        self.client = MongoClient(f'mongodb://{user}:{password}@{host}:{port}/')
        self.database = self.client[database]
        self.collection = collection

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'MongoDB':
        return cls(
            database=config[ConfigKey.MONGODB_DATABASE],
            host=config[ConfigKey.MONGODB_HOST],
            password=config[ConfigKey.MONGODB_PASSWORD],
            user=config[ConfigKey.MONGODB_USER],
            collection=config[ConfigKey.MONGODB_COLLECTION],
            port=config[ConfigKey.MONGODB_PORT],
        )

    def load(
        self,
        collection: str = None,
        query: Dict = dict(),
        **kwargs,
    ) -> DataFrame:
        """
        Loads the data frame from the MongoDB collection.

        Args:
            collection (str): MongoDB collection name.
            query (Dict): Filter the result by using a query object. Examples:
                { "address": "Park Lane 38" }, { "address": { "$gt": "S" } }

        Returns:
            DataFrame: Data frame object loaded from the MongoDB collection.
        """
        collection = collection or self.collection
        if collection is None:
            raise Exception(
                'Please provide the collection name either in the method args or in'
                ' io_config.yaml.')
        return DataFrame(list(self.database[collection].find(query)))

    def export(
        self,
        data: Union[DataFrame, List[Dict]],
        collection: str = None,
        **kwargs,
    ) -> None:
        """
        Exports the input dataframe to the MongoDB collection

        Args:
            data (Union[DataFrame, List[Dict]): Data frame or List of Dictionary to export.
            collection (str): MongoDB collection name.
        """
        if not data:
            return
        collection = collection or self.collection
        if collection is None:
            raise Exception(
                'Please provide the collection name either in the method args or in'
                ' io_config.yaml.')

        if type(data) is list and type(data[0]) is dict:
            records = data
        elif type(data) is DataFrame:
            records = data.to_dict('records')
        else:
            raise Exception('Please provide a pandas DataFrame or a list of dictionary as the'
                            ' input.')
        return self.database[collection].insert_many(records)
