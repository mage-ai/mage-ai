from mage_ai.io.base import BaseFile, FileFormat
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
        return self.reader(self.filepath, *args, **kwargs)

    def export(self, df: DataFrame, **kwargs) -> None:
        """
        Exports the input dataframe to the file specified.

        Args:
            df (DataFrame): Data frame to export.
        """
        return self._write(df, self.filepath, **kwargs)
