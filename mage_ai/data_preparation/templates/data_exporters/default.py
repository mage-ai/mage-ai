from pandas import DataFrame


@data_exporter
def export_data(df: DataFrame) -> None:
    """
    Exports data to some source

    Args:
        df (DataFrame): Data frame to export to
    """
    # Specify your data exporting logic here
