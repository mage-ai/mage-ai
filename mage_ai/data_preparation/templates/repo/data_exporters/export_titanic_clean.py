from pathlib import Path

from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


@data_exporter
def export_data_to_file(df: DataFrame, **kwargs) -> None:
    """
    Save the cleaned Titanic dataset inside the Mage project folder.
    """
    output_dir = project_root() / 'data' / 'processed' / 'titanic'
    output_dir.mkdir(parents=True, exist_ok=True)

    df.to_csv(output_dir / 'titanic_clean.csv', index=False)
