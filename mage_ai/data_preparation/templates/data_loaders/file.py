from mage_ai.data_loader.file import FileLoader


def load_data_from_file():
    """
    Template code for loading data from local filesytem
    """
    filepath = 'path/to/your/file.ext'  # Specify the path to your file.
    return FileLoader(filepath).load()
