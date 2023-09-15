from pathlib import Path

from mage_ai.data_preparation.models.block.dbt.sources import Sources
from mage_ai.tests.base_test import TestCase


class SourcesTest(TestCase):
    """
    Tests the Project class, which is an interface with dbt dbt_project.yml files
    """
    def setUp(self):
        super().setUp()

        self.test_project_path = str(Path(self.repo_path) / 'dbt_project.yml')
        project_yaml = """name: 'base'
version: '1.0.0'
config-version: 2
profile: 'base'
target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"
"""
        with Path(self.test_project_path).open('w') as f:
            f.write(project_yaml)

    def tearDown(self):
        (Path(self.repo_path) / 'models' / 'mage_sources.yml').unlink()
        (Path(self.repo_path) / 'models').rmdir()
        Path(self.test_project_path).unlink()
        super().tearDown()

    def test_add_block(self):
        """
        Tests use cases
        - correctly add blocks
        """
        sources = Sources(self.repo_path)

        sources.add_blocks(
            'test_add_block',
            ['test_block1', 'test_block2'],
            'test_schema',
            'test_database'
        )

        self.assertEqual(
            sources.sources,
            {
                'version': 2,
                'sources': [
                    {
                        'name': 'mage_test_add_block',
                        'description': 'Dataframes of the `test_add_block` mage pipeline.',
                        'loader': 'mage',
                        'tables': [
                            {
                                'name': 'test_block1',
                                'identifier': 'mage_test_add_block_test_block1',
                                'description': (
                                    'Dataframe for block `test_block1` of the ' +
                                    '`test_add_block` mage pipeline.'
                                )
                            },
                            {
                                'name': 'test_block2',
                                'identifier': 'mage_test_add_block_test_block2',
                                'description': (
                                    'Dataframe for block `test_block2` of the ' +
                                    '`test_add_block` mage pipeline.'
                                )
                            }
                        ],
                        'schema': 'test_schema',
                        'database': 'test_database'
                    }
                ]
            }
        )

    def test_add_block_overlapping(self):
        """
        Tests use cases
        - correctly add block already available block in mage_sources.yml
        """
        sources = Sources(self.repo_path)

        sources.add_blocks(
            'test_add_block_overlapping',
            ['test_block1', 'test_block2'],
            'test_schema_new'
        )

        sources.add_blocks(
            'test_add_block_overlapping',
            ['test_block2', 'test_block3'],
            'test_schema_new'
        )

        self.assertEqual(
            sources.sources,
            {
                'version': 2,
                'sources': [
                    {
                        'name': 'mage_test_add_block_overlapping',
                        'description': (
                            'Dataframes of the `test_add_block_overlapping` ' +
                            'mage pipeline.'
                        ),
                        'loader': 'mage',
                        'tables': [
                            {
                                'name': 'test_block1',
                                'identifier': 'mage_test_add_block_overlapping_test_block1',
                                'description': (
                                    'Dataframe for block `test_block1` of the ' +
                                    '`test_add_block_overlapping` mage pipeline.'
                                )
                            },
                            {
                                'name': 'test_block2',
                                'identifier': 'mage_test_add_block_overlapping_test_block2',
                                'description': (
                                    'Dataframe for block `test_block2` of the ' +
                                    '`test_add_block_overlapping` mage pipeline.'
                                )
                            },
                            {
                                'name': 'test_block3',
                                'identifier': 'mage_test_add_block_overlapping_test_block3',
                                'description': (
                                    'Dataframe for block `test_block3` of the ' +
                                    '`test_add_block_overlapping` mage pipeline.'
                                )
                            }
                        ],
                        'schema': 'test_schema_new'
                    }
                ]
            }
        )

    def test_cleanup_pipeline(self):
        """
        Tests use cases
        - correctly cleanup all blocks except of one
        """
        sources = Sources(self.repo_path)

        sources.add_blocks(
            'test_cleanup_pipeline',
            ['test_block1', 'test_block2'],
            'test_schema',
        )

        sources.cleanup_pipeline('test_cleanup_pipeline', ['test_block1'])

        self.assertEqual(
            sources.sources,
            {
                'version': 2,
                'sources': [
                    {
                        'name': 'mage_test_cleanup_pipeline',
                        'description': 'Dataframes of the `test_cleanup_pipeline` mage pipeline.',
                        'loader': 'mage',
                        'tables': [
                            {
                                'name': 'test_block1',
                                'identifier': 'mage_test_cleanup_pipeline_test_block1',
                                'description': (
                                    'Dataframe for block `test_block1` of the ' +
                                    '`test_cleanup_pipeline` mage pipeline.'
                                )
                            }
                        ],
                        'schema': 'test_schema'
                    }
                ]
            }
        )

    def test_cleanup_pipeline_empty(self):
        """
        Tests use cases
        - cleanup non existing mage_sources.yml create the file without any pipelines
        """
        sources = Sources(self.repo_path)

        sources.cleanup_pipeline('test_cleanup_pipeline_empty', [])

        self.assertEqual(
            sources.sources,
            {
                'version': 2,
                'sources': []
            }
        )

    def test_cleanup_pipeline_full(self):
        """
        Tests use cases
        - correctly cleanup all blocks
        """
        sources = Sources(self.repo_path)

        sources.add_blocks(
            'test_cleanup_pipeline_full',
            ['test_block1'],
            'test_schema',
        )

        sources.cleanup_pipeline('test_cleanup_pipeline_full', [])

        self.assertEqual(
            sources.sources,
            {
                'version': 2,
                'sources': []
            }
        )

    def test_cleanup_pipeline_non_overlapping(self):
        """
        Tests use cases
        - correctly cleanup no block, as the blocks are not part of the mage_sources.yml
        """
        sources = Sources(self.repo_path)

        sources.add_blocks(
            'test_cleanup_pipeline_non_overlapping',
            ['test_block1'],
            'test_schema',
        )

        sources.cleanup_pipeline('test_cleanup_pipeline_non_overlapping', ['test_block2'])

        self.assertEqual(
            sources.sources,
            {
                'version': 2,
                'sources': []
            }
        )

    def test_reset_pipeline(self):
        """
        Tests use cases
        - correctly reset pipeline
        """
        sources = Sources(self.repo_path)

        sources.add_blocks(
            'test_reset_pipeline',
            ['test_block1', 'test_block2'],
            'test_schema',
        )

        sources.reset_pipeline(
            'test_reset_pipeline',
            ['test_block1'],
            'test_schema_new',
        )

        self.assertEqual(
            sources.sources,
            {
                'version': 2,
                'sources': [
                    {
                        'name': 'mage_test_reset_pipeline',
                        'description': 'Dataframes of the `test_reset_pipeline` mage pipeline.',
                        'loader': 'mage',
                        'tables': [
                            {
                                'name': 'test_block1',
                                'identifier': 'mage_test_reset_pipeline_test_block1',
                                'description': (
                                    'Dataframe for block `test_block1` ' +
                                    'of the `test_reset_pipeline` mage pipeline.'
                                )
                            }
                        ],
                        'schema': 'test_schema_new'
                    }
                ]
            }
        )
