import logging
from typing import List

import weaviate
from pandas import DataFrame

from mage_ai.io.base import BaseIO
from mage_ai.io.config import BaseConfigLoader, ConfigKey

LOGGER = logging.getLogger(__name__)


class Weaviate(BaseIO):
    def __init__(
            self,
            endpoint: str,
            instance_api_key: str,
            inference_api_key: str,
            collection: str,
            verbose: bool = True,
            **kwargs,) -> None:
        """
        Initializes settings to connect to weaviate.
        """
        super().__init__(verbose=verbose)
        self.client = weaviate.Client(
            url=endpoint,
            auth_client_secret=weaviate.AuthApiKey(api_key=instance_api_key),
            additional_headers={
                'X-OpenAI-Api-Key': inference_api_key
            }
        )
        self.collection = collection

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Weaviate':
        return cls(
            endpoint=config[ConfigKey.WEAVIATE_ENDPOINT],
            instance_api_key=config[ConfigKey.WEAVIATE_INSTANCE_API_KEY],
            inference_api_key=config[ConfigKey.WEAVIATE_INFERENCE_API_KEY],
            collection=config[ConfigKey.WEAVIATE_COLLECTION],
        )

    def create_collection(
            self,
            collection: str,
            vectorizer_module: str = 'text2vec-openai',
            generative_module: str = 'generative-openai'):
        """
        Create collection in weaviate db.
        Args:
            collection (str): name of the collection.
            Defaults to the name defined in io_config.yaml.
            vectorizer_module (str): name of the vectorizer module.
            Defaults to 'text2vec-openai'.
            generative_module (str): name of the generative module.
            Defaults to 'generative-openai'.
        """
        # Create collection
        class_obj = {
            'class': collection,
            'vectorizer': vectorizer_module,
            'moduleConfig': {
                vectorizer_module: {},
                generative_module: {}
            }
        }
        self.client.schema.create_class(class_obj)

    def load(
        self,
        properties: List,
        collection: str = None,
        with_limit: int = None,
        with_text: str = None,
        **kwargs,
    ) -> DataFrame:
        """
        Load data from weaviate db.
        Args:
            properties (List): list of columns to load.
            collection (str): name of the collection.
            Defaults to the name defined in io_config.yaml.
            with_limit (int): limit number of results returned.
            with_text (str): text to query.
        """
        collection = collection or self.collection
        query_statement = self.client.query.get(collection, properties)
        if with_limit:
            query_statement.with_limit(with_limit)
        if with_text:
            query_statement.with_near_text({
                'concepts': [with_text]
            })
        try:
            response = query_statement.do()
            records = response['data']['Get'][collection]
        except Exception:
            LOGGER.error(f'Error in querying data: {response}')
            return
        flatten_data = {}
        for column in properties:
            flatten_data[column] = [x[column] for x in records]
        return DataFrame.from_dict(flatten_data)

    def export(
        self,
        df: DataFrame,
        collection: str = None,
        **kwargs,
    ) -> None:
        """
        Write data into weaviate db.
        Args:
            df (DataFrame): data frame to write.
            collection (str): name of the collection.
        """
        collection = collection or self.collection
        # Create collection if not existing
        try:
            self.client.schema.get(collection)
        except Exception:
            LOGGER.info(f'Collection {collection} does not exist. Creating collection.')
            self.create_collection(collection)

        data_objs = df.to_dict('records')
        self.client.batch.configure(batch_size=100)
        with self.client.batch as batch:
            for data_obj in data_objs:
                batch.add_data_object(
                    data_obj,
                    collection,
                )
