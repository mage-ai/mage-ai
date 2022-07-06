from mage_ai.io.file import FileIO
from pandas import DataFrame


@data_loader
def load_data_from_file() -> DataFrame:
    """
    Template code for loading data from local filesytem
    """
    filepath = 'path/to/your/file.ext'  # Specify the path to your file.
    return FileIO(filepath).load()
