from enum import Enum
import pandas as pd


class FileFormat(str, Enum):
    CSV = 'csv'
    JSON = 'json'
    PARQUET = 'parquet'
    HDF5 = 'hdf5'


class GCPAccountType(str, Enum):
    USER = 'user'
    SERVICE = 'service'


FORMAT_TO_FUNCTION = {
    FileFormat.CSV: pd.read_csv,
    FileFormat.JSON: pd.read_json,
    FileFormat.PARQUET: pd.read_parquet,
    FileFormat.HDF5: pd.read_hdf,
}
