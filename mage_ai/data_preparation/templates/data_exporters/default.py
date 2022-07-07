from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data(df: DataFrame) -> None:
    """
    Exports data to some source

    Args:
        df (DataFrame): Data frame to export to
    """
    # Specify your data exporting logic here
