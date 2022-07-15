from mage_ai.io.base import BaseFile, FileFormat, QUERY_ROW_LIMIT
from pandas import DataFrame
from typing import Any, Mapping, Union
from os import PathLike


class FileIO(BaseFile):
    """
    Handles data transfer between the filesystem and the Mage app.
    """

    def load(self, limit: int = QUERY_ROW_LIMIT, *args, **kwargs) -> DataFrame:
        """
        Loads the data frame from the file specified. This function will load at
        maximum 100,000 rows of data from the specified file.

        limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults to 100000.

        Returns:
            DataFrame: Data frame object loaded from the specified data frame.
        """
        if self.can_limit:
            kwargs['nrows'] = limit
        with self.printer.print_msg(f'Loading data frame from \'{self.filepath}\''):
            df = self.reader(self.filepath, *args, **kwargs)
        if not self.can_limit:
            df = self._trim_df(df, limit)
        return df

    def export(self, df: DataFrame, **kwargs) -> None:
        """
        Exports the input dataframe to the file specified.

        Args:
            df (DataFrame): Data frame to export.
        """
        with self.printer.print_msg(f'Exporting data frame to \'{self.filepath}\''):
            self._write(df, self.filepath, **kwargs)

    @classmethod
    def with_config(
        cls,
        config: Mapping[str, Any],
        filepath: PathLike,
        format: Union[FileFormat, str] = None,
        verbose=False,
    ) -> 'FileIO':
        """
        Initializes FileIO client from configuration loader. This method is identical to the
        main constructor is and kept for compatibility.
        """
        return cls(filepath, format, verbose)
