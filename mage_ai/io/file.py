from mage_ai.io.base import BaseFile, FileFormat
from mage_ai.shared.utils import files_in_path
from pandas import DataFrame
from typing import List, Union
import os
import pandas as pd


class FileIO(BaseFile):
    """
    Handles data transfer between the filesystem and the Mage app.
    """

    def load(
        self,
        filepath: Union[str, os.PathLike] = None,
        format: Union[FileFormat, str, None] = None,
        file_directories: List[str] = None,
        **kwargs,
    ) -> DataFrame:
        """
        Loads the data frame from the filepath specified.

        Args:
            filepath (os.PathLike): Filepath to load data frame from.
            format (Union[FileFormat, str], Optional): Format of the file to load data frame from.
            Defaults to None, in which case the format is inferred.

        Returns:
            DataFrame: Data frame object loaded from the specified data frame.
        """

        with self.printer.print_msg(f'Loading data frame from \'{filepath}\''):
            if not file_directories:
                if format is None:
                    format = self._get_file_format(filepath)

                return self._read(filepath, format, **kwargs)

            file_paths = []
            for file_directory in file_directories:
                file_paths += files_in_path(file_directory)

            dfs = []
            for fp in file_paths:
                if format is None:
                    format = self._get_file_format(fp)
                df = self._read(fp, format, **kwargs)
                dfs.append(df)

            return pd.concat(dfs, axis=0, ignore_index=True)

    def export(
        self,
        df: DataFrame,
        filepath: Union[str, os.PathLike],
        format: Union[FileFormat, str, None] = None,
        **kwargs,
    ) -> None:
        """
        Exports the input dataframe to the file specified.

        Args:
            df (DataFrame): Data frame to export.
            filepath (os.PathLike): Filepath to export data frame to.
            format (Union[FileFormat, str], Optional): Format of the file to export data frame to.
            Defaults to None, in which case the format is inferred.
        """
        if format is None:
            format = self._get_file_format(filepath)
        with self.printer.print_msg(f'Exporting data frame to \'{filepath}\''):
            self._write(df, format, filepath, **kwargs)

    def exists(
        self,
        filepath: Union[os.PathLike, str],
    ) -> bool:
        return os.path.exists(filepath)
