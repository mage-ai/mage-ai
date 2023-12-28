from typing import List

from pandas import DataFrame
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey

DEFAULT_EMBEDDING_MODEL = 'all-MiniLM-L6-v2'


class Qdrant(BaseIO):
    def __init__(
            self,
            collection: str,
            path: str = None,
            verbose: bool = True,
            **kwargs,) -> None:
        """
        Initializes connection to qdrant db.
        """
        super().__init__(verbose=verbose)
        self.collection = collection
        self.path = path
        self.open()

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Qdrant':
        return cls(
            collection=config[ConfigKey.QDRANT_COLLECTION],
            path=config[ConfigKey.QDRANT_PATH],
        )

    def create_collection(
            self,
            vector_size: int,
            distance: models.Distance = None,
            collection_name: str = None):
        """
        Create collection in qdrant db.
        Args:
            vector_size (int): dimension size of the vector.
            distance (models.Distance): distance metric to use.
            collection_name (str): name of the collection.
            Defaults to the name defined in io_config.yaml.
        Returns:
            collection created.
        """
        collection_name = collection_name or self.collection
        distance = distance or models.Distance.COSINE
        return self.client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=distance),
        )

    def load(
        self,
        limit_results: int,
        query_vector: List,
        collection_name: str = None,
        **kwargs,
    ) -> DataFrame:
        """
        Loads the data from Qdrant with query_vector.
        Args:
            limit_results (int): Number of results to return.
            query_vector (List): vector list used to query.
            collection_name (str): name of the collection.
            Defaults to the name defined in io_config.yaml.
        Returns:
            DataFrame: Data frame object loaded with data from qdrant
        """
        # Assume collection is already created and exists.
        collection_name = collection_name or self.collection

        hitted_results = self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit_results,
            with_vectors=True,
        )

        output_df = {}
        output_df['id'] = [hit.id for hit in hitted_results]
        output_df['payload'] = [hit.payload for hit in hitted_results]
        output_df['score'] = [hit.score for hit in hitted_results]
        output_df['vector'] = [hit.vector for hit in hitted_results]

        return DataFrame.from_dict(output_df)

    def export(
        self,
        df: DataFrame,
        document_column: str,
        id_column: str = None,
        vector_column: str = None,
        collection_name: str = None,
        vector_size: int = None,
        distance: models.Distance = None,
        **kwargs,
    ) -> None:
        """
        Save data into Qdrant.
        Args:
            df (DataFrame): Data to export.
            document_column (str): Column name containinng documents to export.
            id_column (str): Column name of the id. Default will use index in df.
            vector_column (str): Column name of the vector. Will use default
            encoder to auto generate query vector to auto generate query vector.
            collection_name (str): name of the collection.
            vector_size (int): dimension size of vector.
            distance (models.Distance): distance metric to use.
        """
        collection_name = collection_name or self.collection
        encoder = SentenceTransformer(DEFAULT_EMBEDDING_MODEL)

        try:
            self.client.get_collection(collection_name)
        except ValueError:
            print(f'Creating collection: {collection_name}')
            self.create_collection(
                vector_size=vector_size or encoder.get_sentence_embedding_dimension(),
                distance=distance,
                collection_name=collection_name,
            )

        payloads = df[document_column].tolist()
        if id_column is None:
            ids = [x for x in df.index.tolist()]
        else:
            ids = df[id_column].tolist()
        if vector_column is None:
            vectors = [encoder.encode(str(x)).tolist() for x in payloads]
        else:
            vectors = df[vector_column].tolist()

        self.client.upsert(
            collection_name=collection_name,
            points=models.Batch(
                ids=ids,
                payloads=payloads,
                vectors=vectors,
            ),
        )

    def __del__(self):
        self.close()

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, *args):
        self.close()

    def open(self) -> None:
        """
        Opens an underlying connection to Qdrannt.
        """
        if self.path is None:
            self.client = QdrantClient(':memory:')
        else:
            self.client = QdrantClient(path=self.path)

    def close(self) -> None:
        """
        Close the underlying connection to Qdrant.
        """
        self.client.close()
