from mage_ai.data_loader.base import BaseLoader
from mage_ai.data_loader.constants import FileFormat, FORMAT_TO_FUNCTION
from pandas import DataFrame
import os


class FileLoader(BaseLoader):
    def __init__(self, filepath: os.PathLike, format: FileFormat = None) -> None:
        """
        Loads a data frame from a file.

        Args:
            filepath (PathLike): Path to the file to load the data frame from.
            format (FileFormat): Format of the file to load the data frame from. Default is None, in which case the appropriate file format is inferred.
        """
        self.filepath = filepath
        if format is None:
            format = os.path.splitext(filepath)[-1][1:]
        self.opener = FORMAT_TO_FUNCTION[format]

    def load_data(self, *args, **kwargs) -> DataFrame:
        """
        Loads the data frame from the file specified.

        Returns:
            DataFrame: Data frame object loaded from the specified data frame.
        """
        return self.opener(self.filepath, *args, **kwargs)
