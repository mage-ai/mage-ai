from io import BytesIO
from mage_ai.io.base import BaseFile, FileFormat, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from pandas import DataFrame
from pathlib import Path
import boto3


class S3(BaseFile):
    """
    Handles data transfer between a S3 bucket and the Mage app. Supports loading files
    of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"

    If profile is stored on file (in `~/.aws`), no further arguments are needed other than those
    specified below. Otherwise, use the factory method `with_credentials` to construct
    the data loader using manually specified credentials.
    """

    def __init__(
        self,
        verbose=False,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from an S3 bucket. If IAM profile is stored on
        file (in `~/.aws`), no further arguments are needed other than those
        specified below. Otherwise, specify:
        - `aws_access_key_id` - AWS IAM access key ID
        - `aws_secret_access_key` - AWS IAM secret access key
        - `region_name` - name of AWS Region associated with profile
        """
        super().__init__(verbose=verbose)
        self.client = boto3.client('s3', **kwargs)

    def load(
        self,
        bucket_name: str,
        object_key: str,
        format: FileFormat = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
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
        if format is None:
            format = self._get_file_format(object_key)
        with self.printer.print_msg(
            f'Loading data frame from bucket \'{bucket_name}\' at key \'{object_key}\''
        ):
            response = self.client.get_object(Bucket=bucket_name, Key=object_key)
            buffer = BytesIO(response['Body'].read())
        return self._read(buffer, format, limit, **kwargs)

    def export(
        self, df: DataFrame, bucket_name: str, object_key: str, format: FileFormat = None, **kwargs
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
        if format is None:
            format = self._get_file_format(object_key)

        with self.printer.print_msg(
            f'Exporting data frame to bucket \'{bucket_name}\' at key \'{object_key}\''
        ):
            if self.format == FileFormat.HDF5:
                temp_dir = Path.cwd() / '.tmp'
                temp_dir.mkdir(parents=True, exist_ok=True)
                obj_loc = temp_dir / f'{self.name}.hdf5'

                self._write(df, format, obj_loc, **kwargs)
                with obj_loc.open('rb') as fin:
                    self.client.put_object(Body=fin, Bucket=bucket_name, Key=object_key)

                obj_loc.unlink()
                temp_dir.rmdir()
            else:
                buffer = BytesIO()
                self._write(df, format, buffer, **kwargs)
                buffer.seek(0)
                self.client.put_object(Body=buffer, Bucket=bucket_name, Key=object_key)

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'S3':
        """
        Initializes S3 client from configuration loader.

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        return cls(
            aws_access_key_id=config[ConfigKey.AWS_ACCESS_KEY_ID],
            aws_secret_access_key=config[ConfigKey.AWS_SECRET_ACCESS_KEY],
            region_name=config[ConfigKey.AWS_REGION],
            **kwargs,
        )
