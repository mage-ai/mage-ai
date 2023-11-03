import os
from enum import Enum
from pathlib import Path
from typing import Any, Mapping, Optional, Union

import yaml


class IOConfigKeys(str, Enum):
    AWS = 'AWS'
    BIGQUERY = 'BigQuery'
    CLICKHOUSE = 'ClickHouse'
    DRUID = 'Druid'
    DUCKDB = 'DuckDB'
    FILE = 'File'
    PINOT = 'Pinot'
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
        filepath: Optional[Union[os.PathLike, str]] = None
    ) -> None:
        """
        Initializes IO Configuration loader

        Args:
            filepath (os.PathLike): Path to IO configuration file.
        """
        self.filepath = Path(filepath) if filepath else Path('default_repo', 'io_config.yaml')

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
