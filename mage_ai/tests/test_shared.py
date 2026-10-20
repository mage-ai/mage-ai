from scipy.sparse import csr_matrix

from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.tabular.mocks import create_dataframe
from mage_ai.data_cleaner.shared.utils import wrap_column_name
from mage_ai.tests.base_test import TestCase


class SharedTests(TestCase):
    def test_wrap_column_name(self):
        column_names = [
            'good_name',
            'bad name',
            'name_with_symbols!%^&*()-+_=',
            'crazy _)_+(+_a aslfiewawlhi 3452',
            'AnotherGoodName',
            'NowNoGood(at_least_filtering_wise)',
        ]
        expected_names = [
            'good_name',
            '"bad name"',
            '"name_with_symbols!%^&*()-+_="',
            '"crazy _)_+(+_a aslfiewawlhi 3452"',
            'AnotherGoodName',
            '"NowNoGood(at_least_filtering_wise)"',
        ]
        for name, expected_name in zip(column_names, expected_names):
            self.assertEqual(wrap_column_name(name), expected_name)


def build_pandas(*args, **kwargs):
    return create_dataframe(n_rows=1_000, use_pandas=True)


def build_pandas_series(*args, **kwargs):
    df = create_dataframe(n_rows=2_000, use_pandas=True)
    return df[df.columns[0]]


def build_polars(*args, **kwargs):
    return create_dataframe(n_rows=3_000)


def build_polars_series(*args, **kwargs):
    df = create_dataframe(n_rows=4_000)
    return df[df.columns[0]]


def build_iterable(*args, **kwargs):
    return [i for i in range(5_000)]


def build_matrix_sparse(*args, **kwargs):
    row_count = 6000

    data = []
    rows = []
    cols = []

    for i in range(int(row_count / 2)):
        # Replicate the 3x3 pattern for each block of 2 rows
        data.extend([1, 2, 1, 2, 3, 2])  # Replicated entries for simplicity
        rows.extend([
            i * 2,
            i * 2,
            i * 2 + 1,
            i * 2 + 1,
            i * 2 + 1,
            i * 2 + 1,
        ])  # Repeat every two rows
        cols.extend([0, 2, 2, 0, 1, 2])  # Columns indices are consistent with your pattern

    # Create the CSR matrix with specified shape
    return csr_matrix((data, (rows, cols)), shape=(row_count, 3))


def build_list_complex(*args, **kwargs):
    return [DataGenerator([i for i in range(100)]) for i in range(100)] + [
        build_pandas(),
        build_pandas_series(),
        build_polars(),
        build_polars_series(),
        build_iterable(),
        build_matrix_sparse(),
    ]
