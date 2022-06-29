from mage_ai.data_loader.base import BaseFile
from pandas import DataFrame


class FileLoader(BaseFile):
    def load_data(self, *args, **kwargs) -> DataFrame:
        """
        Loads the data frame from the file specified.

        Returns:
            DataFrame: Data frame object loaded from the specified data frame.
        """
        return self.opener(self.filepath, *args, **kwargs)
