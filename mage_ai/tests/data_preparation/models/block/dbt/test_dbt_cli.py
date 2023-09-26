import shutil
from pathlib import Path

from dbt.include.starter_project import PACKAGE_PATH as starter_project_directory

from mage_ai.data_preparation.models.block.dbt.dbt_cli import DBTCli
from mage_ai.tests.base_test import TestCase


class DBTCliTest(TestCase):
    """
    Tests the DBTCli class, which is an interface with the dbt cli
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

        # create model.sql
        self.model_full_path = str(Path(self.project_dir) / 'models' / 'mage_test_model.sql')
        model = r"{{ config(materialized='table') }}select 1 as id"
        with Path(self.model_full_path).open('w') as f:
            f.write(model)

        # create schema.yml
        self.schema_full_path = str(Path(self.project_dir) / 'models' / 'schema.yml')
        schema = """
version: 2
models:
  - name: mage_test_model
    columns:
      - name: id
        tests:
          - unique
"""
        with Path(self.schema_full_path).open('w') as f:
            f.write(schema)

    @classmethod
    def tearDownClass(self):
        shutil.rmtree(self.project_dir)
        super().tearDownClass()

    def test_invoke(self):
        DBTCli([
            'build',
            '--profiles-dir', self.project_dir,
            '--project-dir', self.project_dir,
            '--select', 'mage_test_model'
        ]).invoke()

        DBTCli([
            'clean',
            '--project-dir', self.project_dir,
        ]).invoke()

    def test_to_pandas(self):
        DBTCli([
            'run',
            '--profiles-dir', self.project_dir,
            '--project-dir', self.project_dir,
            '--select', 'mage_test_model'
        ]).invoke()

        df, _res, success = DBTCli([
            'show',
            '--profiles-dir', self.project_dir,
            '--project-dir', self.project_dir,
            '--select', 'mage_test_model',
            '--limit', '1'
        ]).to_pandas()

        self.assertTrue(success)

        self.assertEqual(
            df.to_dict(),
            {'id': {0: 1}}
        )
