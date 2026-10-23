from typing import Dict, List, Union, Optional
from urllib.parse import unquote, urlparse

from pandas import DataFrame
from pymongo import MongoClient

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey


def extract_db_name_from_uri(connection_string: str) -> Optional[str]:
    """
    Extract the database name from a MongoDB connection string URI.

    Args:
        connection_string: MongoDB connection string (e.g., mongodb://user:pass@host:27017/my_db)

    Returns:
        The database name extracted from the URI path, or None if not present.

    Notes:
        URL-encoded database names are decoded.
        For nested paths, only the first segment is used as the database name.

    Examples:
        >>> extract_db_name_from_uri("mongodb://user:pass@host:27017/my_db")
        'my_db'
        >>> extract_db_name_from_uri("mongodb://host:27017/my_db/collection")
        'my_db'
        >>> extract_db_name_from_uri("mongodb://host:27017/my%5Fdb")
        'my_db'
    """
    if not connection_string:
        return None

    try:
        parsed = urlparse(connection_string)
        path = parsed.path

        if path and path.startswith('/'):
            path = path[1:]

        if not path:
            return None

        # Take only the first segment for nested paths
        db_name = path.split('/')[0]

        # URL decode the database name
        db_name = unquote(db_name)

        return db_name if db_name else None
    except Exception:
        return None


class MongoDB(BaseIO):
    def __init__(
        self,
        connection_string: str = None,
        host: str = None,
        port: int = 27017,
        user: str = None,
        password: str = None,
        database: str = None,
        collection: str = None,
        verbose: bool = True,
        **kwargs,
    ) -> None:
        super().__init__(verbose=verbose)
        if connection_string:
            self.client = MongoClient(connection_string)
            # Extract database from URI if not explicitly provided
            if database is None:
                database = extract_db_name_from_uri(connection_string)
        else:
            self.client = MongoClient(f'mongodb://{user}:{password}@{host}:{port}/')
        if database is None:
            raise Exception(
                'Please provide the database name either in the constructor arguments or in '
                'the connection string URI.'
            )
        self.database = self.client[database]
        self.collection = collection

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'MongoDB':
        return cls(
            connection_string=config[ConfigKey.MONGODB_CONNECTION_STRING],
            host=config[ConfigKey.MONGODB_HOST],
            port=config[ConfigKey.MONGODB_PORT],
            user=config[ConfigKey.MONGODB_USER],
            password=config[ConfigKey.MONGODB_PASSWORD],
            database=config[ConfigKey.MONGODB_DATABASE],
            collection=config[ConfigKey.MONGODB_COLLECTION],
        )

    def load(
        self,
        collection: str = None,
        query: Dict = None,
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
        if query is None:
            query = dict()

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
        if data is None:
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
