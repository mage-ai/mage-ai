from pathlib import Path

from mage_ai.data_preparation.models.block.dbt.project import Project
from mage_ai.tests.base_test import TestCase


class ProjectTest(TestCase):
    """
    Tests the Project class, which is an interface with dbt dbt_project.yml files
    """
    @classmethod
    def setUpClass(self):
        super().setUpClass()

        self.test_base_project_path = str(Path(self.repo_path) / 'dbt_project.yml')
        self.test_demo_project_path = str(Path(self.repo_path) / 'demo' / 'dbt_project.yml')
        project_yaml = """name: 'base'
version: '1.0.0'
config-version: 2
profile: 'base'
target-path: "target"  # directory which will store compiled SQL files
clean-targets:         # directories to be removed by `dbt clean`
  - "target"
  - "dbt_packages"
"""
        with Path(self.test_base_project_path).open('w') as f:
            f.write(project_yaml)

        Path(self.test_demo_project_path).parent.mkdir()
        with Path(self.test_demo_project_path).open('w') as f:
            f.write(project_yaml)

        self.test_packages_path = str(Path(self.repo_path) / 'packages.yml')
        packages_yaml = """packages:
  - local: demo
"""
        with Path(self.test_packages_path).open('w') as f:
            f.write(packages_yaml)

    @classmethod
    def tearDownClass(self):
        Path(self.test_base_project_path).unlink()
        Path(self.test_demo_project_path).unlink()
        Path(self.test_demo_project_path).parent.rmdir()
        Path(self.test_packages_path).unlink()
        super().tearDownClass()

    def test_project(self):
        project = Project(self.repo_path)
        self.assertEqual(
            {
                'clean-targets': ['target', 'dbt_packages'],
                'config-version': 2,
                'name': 'base',
                'profile': 'base',
                'target-path': 'target',
                'version': '1.0.0'
            },
            project.project
        )

    def test_local_packages(self):
        self.assertEqual(
            ['demo'],
            Project(self.repo_path).local_packages
        )
