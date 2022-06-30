from mage_ai.data_loader.file import FileLoader
from pandas import DataFrame


@data_loader
def load_data_from_file() -> DataFrame:
    """
    Template code for loading data from local filesytem
    """
    filepath = 'path/to/your/file.ext'  # Specify the path to your file.
    return FileLoader(filepath).load()
