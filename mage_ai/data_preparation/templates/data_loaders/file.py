from mage_ai.io.file import FileIO
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_file(**kwargs) -> DataFrame:
    """
    Template for loading data from filesystem.
    """
    filepath = 'path/to/your/file.csv'
    return FileIO().load(filepath)
