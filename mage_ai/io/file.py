from mage_ai.io.base import BaseFile
from pandas import DataFrame


class FileLoader(BaseFile):
    def load(self, *args, **kwargs) -> DataFrame:
        """
        Loads the data frame from the file specified.

        Returns:
            DataFrame: Data frame object loaded from the specified data frame.
        """
        return self.reader(self.filepath, *args, **kwargs)
