from mage_ai.io.base import BaseFile
from pandas import DataFrame


class FileIO(BaseFile):
    """
    Handles data transfer between the filesystem and the Mage app.
    """

    def load(self, *args, **kwargs) -> DataFrame:
        """
        Loads the data frame from the file specified.

        Returns:
            DataFrame: Data frame object loaded from the specified data frame.
        """
        with self.printer.print_msg(f'Loading data frame from \'{self.filepath}\''):
            df = self.reader(self.filepath, *args, **kwargs)
        return df

    def export(self, df: DataFrame, **kwargs) -> None:
        """
        Exports the input dataframe to the file specified.

        Args:
            df (DataFrame): Data frame to export.
        """
        with self.printer.print_msg(f'Exporting data frame to \'{self.filepath}\''):
            self._write(df, self.filepath, **kwargs)
