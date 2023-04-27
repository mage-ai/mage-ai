from enum import Enum
from typing import Any, Mapping, Union
import pathlib
import os
import yaml


class IOConfigKeys(str, Enum):
    AWS = 'AWS'
    BIGQUERY = 'BigQuery'
    CLICKHOUSE = 'ClickHouse'
    DRUID = 'Druid'
    FILE = 'File'
    POSTGRES = 'PostgreSQL'
    REDSHIFT = 'Redshift'
    S3 = 'S3'
    SNOWFLAKE = 'Snowflake'


class IOConfig:
    """
    Wrapper around IO configuration file.
    """

    def __init__(
        self,
        filepath: Union[os.PathLike, str] = './default_repo/io_config.yaml'
    ) -> None:
        """
        Initializes IO Configuration loader

        Args:
            filepath (os.PathLike): Path to IO configuration file.
        """
        self.filepath = pathlib.Path(filepath)

    def use(self, profile: str) -> Mapping[str, Any]:
        """
        Specifies the profile to use. Profiles are sets of configuration settings.

        Args:
            profile (str): Name of the profile to use.

        Returns:
            Mapping[str, Any]: Configuration settings for this profile
        """
        with self.filepath.open('r') as fin:
            config = yaml.full_load(fin.read())
        profile_settings = config.get(profile)
        if profile_settings is None:
            raise ValueError(f'Invalid configuration profile specified: \'{profile}\'')
        return profile_settings
