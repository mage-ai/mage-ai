from mage_ai.io.bigquery import BigQuery
from mage_ai.io.postgres import Postgres
from mage_ai.io.redshift import Redshift
from mage_ai.io.s3 import S3
from mage_ai.io.file import FileIO
from mage_ai.io.snowflake import Snowflake
from mage_ai.tests.base_test import TestCase
from pathlib import Path
from sklearn import datasets
import shutil


class ClientTests(TestCase):
    def setUp(self):
        self.data = datasets.fetch_california_housing(as_frame=True)['data']
        test_path = Path('./test')
        test_path.mkdir(parents=True, exist_ok=True)
        self.data.to_csv(test_path / 'data.csv')
        self.data.to_json(test_path / 'data.json')
        self.data.to_parquet(test_path / 'data.parquet')
        self.data.to_hdf(test_path / 'data.hdf5', key='test')
        return super().setUp()
