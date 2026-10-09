import pandas as pd

from mage_ai.io.file import FileIO


def test_load_infers_format_for_each_file(tmp_path):
    pd.DataFrame(
        [
            {
                'id': 1,
                'source': 'csv',
            },
        ],
    ).to_csv(
        tmp_path / 'records.csv',
        index=False,
    )

    pd.DataFrame(
        [
            {
                'id': 2,
                'source': 'json',
            },
        ],
    ).to_json(
        tmp_path / 'records.json',
        orient='records',
    )

    result = FileIO().load(
        file_directories=[str(tmp_path)],
    )

    assert sorted(result['id'].tolist()) == [1, 2]
    assert sorted(result['source'].tolist()) == ['csv', 'json']