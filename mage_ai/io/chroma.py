import logging
from typing import Dict

import chromadb
from pandas import DataFrame

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey

logger = logging.getLogger(__name__)


class Chroma(BaseIO):
    def __init__(
            self,
            collection: str,
            path: str = None,
            verbose: bool = True,
            **kwargs,) -> None:
        """
        Initializes settings to connect to chroma db.
        """
        super().__init__(verbose=verbose)
        self.collection = collection
        if path is None:
            self.client = chromadb.Client()
        else:
            self.client = chromadb.PersistentClient(path=path)

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Chroma':
        return cls(
            collection=config[ConfigKey.CHROMA_COLLECTION],
            path=config[ConfigKey.CHROMA_PATH],
        )

    def __convert_to_multiple_rows(self, data: Dict, column_name: str, item_length: int):
        """
        Convert the data from chroma query into multiple rows.

        Args:
            data (Dict): Data returned from chroma query.
            Example format:
            {
                'ids': [['id1', '0', 'id2']],
                'distances': [[0.6036068181428754, 0.6036068181428754, 1.267588382105355]],
                'metadatas': [[
                                {'chapter': '3', 'verse': '16'},
                                None,
                                {'chapter': '3', 'verse': '5'}
                              ]],
                'embeddings': None,
                'documents': [['abc', 'abc', 'def']],
                'uris': None,
                'data': None
            }
            column_name (str): Name of the field in data to convert.
            item_length (int): Number of expected items in the list.

        Returns:
            DataFrame: Data frame object loaded from the chroma query fuction.
            Chroma query function requries dictionary contains number of results matched.
        """
        print(f"Testing data: {data}")
        converted_array = []
        if data[column_name] is None:
            for _ in range(item_length):
                converted_array.append('')
        else:
            for list_items in data[column_name]:
                for item in list_items:
                    if item is None:
                        converted_array.append('')
                    else:
                        converted_array.append(item)
        return converted_array

    def load(
        self,
        n_results: int,
        collection: str = None,
        query_embeddings: str = None,
        query_texts: str = None,
        **kwargs,
    ) -> DataFrame:
        """
        Loads the data from Chroma with embeddings or query_texts.

        Args:
            n_results (int): Number of results to return.
            query_embeddings (str): Embeddings to query.
            query_texts (str): Texts to query.

        Returns:
            DataFrame: Data frame object loaded from the chroma query fuction.
            Chroma query function requries dictionary contains number of results matched.
        """
        collection_client = self.client.get_or_create_collection(
                name=self.collection if collection is None else collection)
        # Chroma supports query by embeddings or query texts
        if query_embeddings is not None:
            data = collection_client.query(
                query_embeddings=query_embeddings,
                n_results=n_results
            )
        elif query_texts is not None:
            data = collection_client.query(
                query_texts=query_texts,
                n_results=n_results
            )
        else:
            raise ValueError("query_embeddings or query_texts must be specified")
        # Flatten the query results into multiple rows
        flatten_data = {}
        item_length = len(data['ids'][0])
        flatten_data['ids'] = self.__convert_to_multiple_rows(
            data, 'ids', item_length)
        flatten_data['distances'] = self.__convert_to_multiple_rows(
            data, 'distances', item_length)
        flatten_data['metadatas'] = self.__convert_to_multiple_rows(
            data, 'metadatas', item_length)
        flatten_data['embeddings'] = self.__convert_to_multiple_rows(
            data, 'embeddings', item_length)
        flatten_data['documents'] = self.__convert_to_multiple_rows(
            data, 'documents', item_length)
        flatten_data['data'] = self.__convert_to_multiple_rows(
            data, 'data', item_length)
        return DataFrame.from_dict(flatten_data)

    def export(
        self,
        df: DataFrame,
        document_column: str,
        collection: str = None,
        **kwargs,
    ) -> None:
        """
        Exports the input dataframe to the chroma collection.
        The column required is document_column.
        It contains the contextual prompt for query and search.

        Args:
            df (DataFrame): Data frame to export.
            document_column (str): name of the document.
        """
        docs = df[f'{document_column}'].tolist()
        ids = [str(x) for x in df.index.tolist()]
        collection_client = self.client.get_or_create_collection(
                name=self.collection if collection is None else collection)
        return collection_client.add(
            documents=docs,
            ids=ids,
        )
