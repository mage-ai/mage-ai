from pandas import DataFrame

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data() -> DataFrame:
    """
    Template code for loading data from any source.

    Returns:
        DataFrame: Returned pandas data frame.
    """
    # Specify your data loading logic here
    return DataFrame({})
