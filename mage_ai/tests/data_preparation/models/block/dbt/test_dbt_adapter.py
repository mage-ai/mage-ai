import os
import shutil
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

from dbt.include.starter_project import PACKAGE_PATH as starter_project_directory

from mage_ai.data_preparation.models.block.dbt.dbt_adapter import DBTAdapter
from mage_ai.tests.base_test import AsyncDBTestCase


class DBTAdapterTest(AsyncDBTestCase):
    """
    Tests the Project Class, which is an interface with dbt dbt_project.yml files
    """
    @classmethod
    def setUpClass(self):
        super().setUpClass()

        self.project_name = 'dbt_test_project'
        self.project_dir = str(Path(self.repo_path) / self.project_name)

        # create test dbt project
        shutil.copytree(
            starter_project_directory,
            self.project_dir,
            ignore=shutil.ignore_patterns(*["__init__.py", "__pycache__", ".gitkeep"])
        )

        # template {project_name} in dbt_project.yml
        with (Path(self.project_dir) / 'dbt_project.yml').open("r+") as f:
            content = f"{f.read()}".format(
                project_name=self.project_name,
                profile_name=self.project_name
            )
            f.seek(0)
            f.write(content)
            f.truncate()

        # create profiles.yml
        self.profiles_full_path = str(Path(self.project_dir) / 'profiles.yml')
        profiles_yaml = f"""dbt_test_project:
  outputs:
   dev:
     type: duckdb
     path: {str(Path(self.project_dir) / 'test.db')}
  target: dev
"""
        with Path(self.profiles_full_path).open('w') as f:
            f.write(profiles_yaml)

    @classmethod
    def tearDownClass(self):
        shutil.rmtree(self.project_dir)
        super().tearDownClass()

    def test_execute(self):
        """
        Test the Project Interface by reading the original dbt_project.yml
        and return the dictionary.
        """
        value = 'mage'

        file_path = os.path.join(
            self.repo_path,
            'dbt_test_project',
            f'.mage_temp_profiles_{value}',
            'profiles.yml',
        )

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w') as f:
            f.write('')

        class MockUUID:
            def __str__(self):
                return value

            @property
            def hex(self) -> str:
                return value

        with patch(
            'mage_ai.data_preparation.models.block.dbt.profiles.uuid.uuid4',
            lambda: MockUUID(),
        ):
            with DBTAdapter(str(self.project_dir)) as dbt_adapter:
                # create df
                import pandas as pd
                df = pd.DataFrame([[1, 'foo'], [2, 'bar']], columns=['id', 'text'])
                df_dict = df.to_dict(orient='list')

                # create agate table from df
                from agate import Table
                table = Table(
                    rows=list(map(list, zip(*[v for _, v in df_dict.items()]))),
                    column_names=df_dict.keys()
                )

                relation = dbt_adapter.get_relation(
                    database='test',
                    schema='main',
                    identifier='test',
                )
                relation_context = dict(this=relation)

                dbt_adapter.execute_macro(
                    'reset_csv_table',
                    context_overide=relation_context,
                    model={'config': {}},
                    old_relation=relation,
                    full_refresh=True,
                    agate_table=table
                )

                csv_file_path = os.path.join(self.repo_path, 'test_dbt_adapter.csv')
                df.to_csv(csv_file_path, index=False)

                dbt_adapter.execute_macro(
                    'load_csv_rows',
                    context_overide=relation_context,
                    model={
                        'config': {},
                        'original_file_path': 'test_dbt_adapter.csv',
                        'root_path': self.repo_path,
                    },
                    agate_table=table
                )

                _res, df = dbt_adapter.execute('select * from test.main.test', fetch=True)

                self.assertEqual(
                    df.to_dict(),
                    {
                        0: {'id': Decimal('1'), 'text': Decimal('2')},
                        1: {'id': 'foo', 'text': 'bar'},
                    },
                )

    def test_credentials(self):
        """
        Test the Project Interface by reading the original dbt_project.yml
        and return the dictionary.
        """
        value = 'mage'

        file_path = os.path.join(
            self.repo_path,
            'dbt_test_project',
            f'.mage_temp_profiles_{value}',
            'profiles.yml',
        )

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w') as f:
            f.write('')

        class MockUUID:
            def __str__(self):
                return value

            @property
            def hex(self) -> str:
                return value

        with patch(
            'mage_ai.data_preparation.models.block.dbt.profiles.uuid.uuid4',
            lambda: MockUUID(),
        ):
            with DBTAdapter(str(self.project_dir)) as dbt_adapter:
                credentials = dbt_adapter.credentials
            self.assertEqual(credentials.schema, 'main')
            self.assertEqual(credentials.database, 'test')
