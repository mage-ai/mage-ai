from io import BytesIO
from google.cloud import storage
from google.oauth2 import service_account
from mage_ai.io.base import BaseFile, FileFormat, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from pandas import DataFrame
from typing import Union


class GoogleCloudStorage(BaseFile):
    """
    Handles data transfer between a Google Cloud Storage bucket and the Mage app. Supports
    loading files of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"

    If GOOGLE_APPLICATION_CREDENTIALS environment is set, no further arguments are needed
    other than those specified below. Otherwise, use the factory method `with_config` to construct
    the data loader using manually specified credentials.
    """

    def __init__(
        self,
        verbose: bool = False,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from a Google Cloud Storage bucket.

        To authenticate (and authorize) access to Google Cloud Storage, credentials must be
        provided.
        Below are the different ways to access those credentials:
        - Define the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a
          service account key. In this case no other no other parameters need to be
          specified.
        - Manually pass in the `google.oauth2.service_account.Credentials` object with the
        keyword argument `credentials`
        - Manually pass in the path to the credentials with the keyword argument
        `path_to_credentials`.
        - Manually define the service key key-value set to use (such as a dictionary containing
        the same parameters as a service key) with the keyword argument `credentials_mapping`

        All keyword arguments except for `path_to_credentials` and `credentials_mapping` will be
        passed to the Google Cloud Storage client, accepting all other configuration settings there.
        """

        super().__init__(verbose=kwargs.get('verbose', True))

        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')

        credentials = kwargs.get('credentials')
        if credentials is None:
            if 'credentials_mapping' in kwargs:
                mapping_obj = kwargs.pop('credentials_mapping')
                if mapping_obj is not None:
                    credentials = service_account.Credentials.from_service_account_info(mapping_obj)
            if 'path_to_credentials' in kwargs:
                path = kwargs.pop('path_to_credentials')
                if path is not None:
                    credentials = service_account.Credentials.from_service_account_file(path)
            if 'credentials' in kwargs:
                kwargs.pop('credentials')
        self.client = storage.Client(credentials=credentials, **kwargs)

    def load(
        self,
        bucket_name: str,
        object_key: str,
        format: Union[FileFormat, str, None] = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from Google Cloud Storage into a Pandas data frame. This function will load at
        maximum 10,000,000 rows of data from the specified file.

        Args:
            import_config (Mapping, optional): Configuration settings for importing file from
            Google Cloud Storage. Defaults to None.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults
                                    to 10,000,000.
            read_config (Mapping, optional): Configuration settings for reading file into data
            frame. Defaults to None.

        Returns:
            DataFrame: The data frame constructed from the file in the Google Cloud Storage bucket.
        """
        if format is None:
            format = self._get_file_format(object_key)
        with self.printer.print_msg(
            f'Loading data frame from bucket \'{bucket_name}\' at key \'{object_key}\''
        ):
            bucket = self.client.get_bucket(bucket_name)
            blob = bucket.blob(object_key)
            if not blob.exists():
                return DataFrame()
            buffer = BytesIO(blob.download_as_string())
            return self._read(buffer, format, limit, **kwargs)

    def export(
        self,
        df: DataFrame,
        bucket_name: str,
        object_key: str,
        format: Union[FileFormat, str, None] = None,
        **kwargs,
    ) -> None:
        """
        Exports data frame to a Google Cloud Storage bucket.

        Args:
            df (DataFrame): Data frame to export
            bucket_name (str): Name of the bucket to export data frame to.
            object_key (str): Object key in GoogleCloudStorage bucket to export data frame to.
            format (FileFormat, optional): Format of the file to export data frame to.
                Defaults to None, in which case the format is inferred.
        """
        if format is None:
            format = self._get_file_format(object_key)

        with self.printer.print_msg(
            f'Exporting data frame to bucket \'{bucket_name}\' at key \'{object_key}\''
        ):
            bucket = self.client.get_bucket(bucket_name)
            blob = bucket.blob(object_key)
            buffer = BytesIO()
            self._write(df, format, buffer, **kwargs)
            buffer.seek(0)
            blob.upload_from_string(buffer.read())

    def exists(
        self, bucket_name: str, prefix: str
    ) -> bool:
        """
        Checks if content exists at a certain path in a Google Cloud Storage bucket.
        """
        bucket = self.client.get_bucket(bucket_name)
        blob = bucket.blob(prefix)
        return blob.exists()

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'GoogleCloudStorage':
        """
        Initializes Google Cloud Storage client from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        if ConfigKey.GOOGLE_SERVICE_ACC_KEY in config:
            kwargs['credentials_mapping'] = config[ConfigKey.GOOGLE_SERVICE_ACC_KEY]
        elif ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH in config:
            kwargs['path_to_credentials'] = config[ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH]
        else:
            raise ValueError(
                'No valid configuration settings found for Google Cloud Storage. You must specify '
                'either your service account key or the filepath to your service account key.'
            )
        return cls(**kwargs)
