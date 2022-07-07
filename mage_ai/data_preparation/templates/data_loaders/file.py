from mage_ai.io.file import FileIO
from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data_from_file() -> DataFrame:
    """
    Template code for loading data from local filesytem
    """
    filepath = 'path/to/your/file.ext'  # Specify the path to your file.
    return FileIO(filepath).load()
