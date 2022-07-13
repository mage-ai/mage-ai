from io import BytesIO
from typing import Mapping
from mage_ai.io.base import BaseFile, FileFormat, QUERY_ROW_LIMIT
from mage_ai.io.io_config import IOConfigKeys
from pandas import DataFrame
from pathlib import Path
from typing import Any, Mapping
import boto3


class S3(BaseFile):
    """
    Handles data transfer between a S3 bucket and the Mage app. Supports loading files
    of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"
    """

    def __init__(
        self,
        bucket_name: str,
        object_key: str,
        format: FileFormat = None,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from an S3 bucket. If profile is stored on
        file (in `~/.aws`), no further arguments are needed other than those
        specified below. Otherwise, use the factory method `with_credentials` to construct
        the data loader using manually specified credentials.

        Args:
            bucket_name (str): Bucket to load resource from
            object_key (str): Object key of resource to load
            format (FileFormat, optional): File format of object. Defaults to None, in which
            case the format is inferred.
            **kwargs: all other keyword arguments to pass to the client
        """
        super().__init__(object_key, format)
        self.bucket_name = bucket_name
        self.client = boto3.client('s3', **kwargs)

    def load(
        self,
        read_config: Mapping = None,
        import_config: Mapping = None,
        limit: int = QUERY_ROW_LIMIT,
    ) -> DataFrame:
        """
        Loads data from S3 into a Pandas data frame. This function will load at
        maximum 100,000 rows of data from the specified file.

        Args:
            import_config (Mapping, optional): Configuration settings for importing file from
            S3. Defaults to None.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults to 100000.
            read_config (Mapping, optional): Configuration settings for reading file into data
            frame. Defaults to None.

        Returns:
            DataFrame: The data frame constructed from the file in the S3 bucket.
        """

        if read_config is None:
            read_config = {}
        if import_config is None:
            import_config = {}
        if self.can_limit:
            read_config['nrows'] = limit
        with self.printer.print_msg(
            f'Loading data frame from bucket \'{self.bucket_name}\' at key \'{self.filepath}\''
        ):
            response = self.client.get_object(
                Bucket=self.bucket_name, Key=self.filepath, **import_config
            )
            buffer = BytesIO(response['Body'].read())
        df = self.reader(buffer, **read_config)
        if not self.can_limit:
            df = self._trim_df(df, limit)
        return df

    def export(
        self, df: DataFrame, write_config: Mapping = None, export_config: Mapping = None
    ) -> None:
        """
        Exports data frame to an S3 bucket.

        Args:
            df (DataFrame): Data frame to export
            write_config (Mapping, optional): Configuration settings for writing data frame to
            specified format. Defaults to None.
            export_config (Mapping, optional): Configuration settings for exporting data frame
            to S3. Defaults to None.
        """
        if write_config is None:
            write_config = {}
        if export_config is None:
            export_config = {}

        with self.printer.print_msg(
            f'Exporting data frame to bucket \'{self.bucket_name}\' at key \'{self.filepath}\''
        ):
            if self.format == FileFormat.HDF5:
                temp_dir = Path.cwd() / '.tmp'
                temp_dir.mkdir(parents=True, exist_ok=True)
                obj_loc = temp_dir / f'{self.name}.hdf5'

                self._write(df, obj_loc, **write_config)
                with obj_loc.open('rb') as fin:
                    self.client.put_object(
                        Body=fin, Bucket=self.bucket_name, Key=self.filepath, **export_config
                    )

                obj_loc.unlink()
                temp_dir.rmdir()
            else:
                buffer = BytesIO()
                self._write(df, buffer, **write_config)
                buffer.seek(0)
                self.client.put_object(
                    Body=buffer, Bucket=self.bucket_name, Key=self.filepath, **export_config
                )

    @classmethod
    def with_config(cls, config: Mapping[str, Any]) -> 'S3':
        try:
            aws_config = config[IOConfigKeys.AWS]
            s3_config = aws_config[IOConfigKeys.S3]
        except KeyError:
            raise KeyError(
                f'No configuration settings found for '
                f'\'{IOConfigKeys.AWS}.{IOConfigKeys.S3}\' under profile'
            )
        credentials = ['access_key_id', 'secret_access_key', 'region']
        parameters = ['aws_access_key_id', 'aws_secret_access_key', 'region_name']
        for credential, parameter in zip(credentials, parameters):
            if credential in aws_config:
                s3_config[parameter] = aws_config[credential]
        return cls(**s3_config)

    @classmethod
    def with_credentials(
        cls,
        bucket_name: str,
        object_key: str,
        access_key_id: str,
        secret_access_key: str,
        region: str,
        format: FileFormat = None,
    ) -> 'S3':
        """
        Initializes data loader from an S3 bucket using manually specified credentials.
        If credentials are stored on file under `~/.aws/`, do not use this
        factory method, the default constructor will automatically load the credentials.

        Args:
            bucket_name (str): Bucket to load resource from
            object_key (str): Object key of resource to load
            format (FileFormat, optional): File format of object. Defaults to None,
            in which case the format is inferred.
            access_key_id (str, optional): AWS Access Key ID credential. Specify if IAM
            credentials are not configured. Defaults to None.
            secret_access_key (str, optional): AWS Secret Access Key credential. Specify
            if IAM credentials are not configured. Defaults to None.
            region (str, optional): AWS Region. Specify if IAM credentials are not configured.
            Defaults to None.
        """
        return cls(
            bucket_name=bucket_name,
            object_key=object_key,
            format=format,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
        )
