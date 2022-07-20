from mage_ai.io.base import BaseFile, QUERY_ROW_LIMIT, FileFormat
from pandas import DataFrame
from typing import Union


class FileIO(BaseFile):
    """
    Handles data transfer between the filesystem and the Mage app.
    """

    def load(
        self,
        filepath: str,
        format: FileFormat = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """
        Loads the data frame from the filepath specified. This function will load at
        maximum 100,000 rows of data from the specified file.

        Args:
            filepath (os.PathLike): Filepath to load data frame from.
            format (Union[FileFormat, str], Optional): Format of the file to load data frame from.
            Defaults to None, in which case the format is inferred.
            limit (int, optional): The number of rows to limit the loaded dataframe to.
            Defaults to 100000.

        Returns:
            DataFrame: Data frame object loaded from the specified data frame.
        """
        if format is None:
            format = self._get_file_format(filepath)
        with self.printer.print_msg(f'Loading data frame from \'{filepath}\''):
            return self._read(filepath, format, limit, **kwargs)

    def export(
        self, df: DataFrame, filepath: str, format: Union[FileFormat, str] = None, **kwargs
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
