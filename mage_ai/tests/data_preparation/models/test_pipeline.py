import asyncio
import json
import os
from unittest.mock import patch

import yaml

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import InvalidPipelineError, Pipeline
from mage_ai.data_preparation.models.widget import Widget
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_run_with_schedule


class PipelineTest(DBTestCase):
    def test_create(self):
        pipeline = Pipeline.create(
            'test pipeline',
            repo_path=self.repo_path,
        )
        self.assertEqual(pipeline.uuid, 'test_pipeline')
        self.assertEqual(pipeline.name, 'test pipeline')
        self.assertEqual(pipeline.blocks_by_uuid, dict())
        self.assertTrue(os.path.exists(f'{self.repo_path}/pipelines/test_pipeline/__init__.py'))
        self.assertTrue(os.path.exists(f'{self.repo_path}/pipelines/test_pipeline/metadata.yaml'))

    def test_add_block(self):
        self.__create_pipeline_with_blocks('test pipeline 2')
        pipeline = Pipeline('test_pipeline_2', self.repo_path)

        self.assertEqual(pipeline.to_dict(), dict(
            data_integration=None,
            description=None,
            executor_config=dict(),
            executor_count=1,
            executor_type=None,
            name='test pipeline 2',
            notification_config=dict(),
            uuid='test_pipeline_2',
            tags=[],
            retry_config={},
            spark_config=dict(),
            type='python',
            blocks=[
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block1',
                    uuid='block1',
                    type='data_loader',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block2',
                    uuid='block2',
                    type='transformer',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                    all_upstream_blocks_executed=False,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block3',
                    uuid='block3',
                    type='transformer',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                    all_upstream_blocks_executed=False,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block4',
                    uuid='block4',
                    type='data_exporter',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=['block2', 'block3'],
                    downstream_blocks=['widget1'],
                    all_upstream_blocks_executed=False,
                ),
            ],
            callbacks=[],
            conditionals=[],
            updated_at=None,
            widgets=[
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='widget1',
                    uuid='widget1',
                    type='chart',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=['block4'],
                    downstream_blocks=[],
                    all_upstream_blocks_executed=False,
                ),
            ],
        ))

    def test_update_name_existing_pipeline(self):
        pipeline1 = Pipeline.create(
            'test_pipeline_a',
            repo_path=self.repo_path,
        )
        pipeline2 = Pipeline.create(
            'test_pipeline_b',
            repo_path=self.repo_path,
        )
        with self.assertRaisesRegex(Exception, 'Pipeline test_pipeline_a already exists.'):
            asyncio.run(pipeline2.update(dict(name='test_pipeline_a', uuid='test_pipeline_b')))
        self.assertEqual(pipeline1.name, 'test_pipeline_a')
        self.assertEqual(pipeline2.name, 'test_pipeline_b')

    def test_update_name(self):
        pipeline = Pipeline.create(
            'test_pipeline_c',
            repo_path=self.repo_path,
        )
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline_c')
        pipeline_schedule = pipeline_run.pipeline_schedule
        self.assertEqual(pipeline.name, 'test_pipeline_c')
        self.assertEqual(pipeline.uuid, 'test_pipeline_c')
        self.assertEqual(pipeline_run.pipeline_uuid, 'test_pipeline_c')
        self.assertEqual(pipeline_schedule.pipeline_uuid, 'test_pipeline_c')
        asyncio.run(pipeline.update(dict(name='test_pipeline_c2', uuid='test_pipeline_c')))
        self.assertEqual(pipeline.name, 'test_pipeline_c2')
        self.assertEqual(pipeline.uuid, 'test_pipeline_c2')
        self.assertEqual(pipeline_run.pipeline_uuid, 'test_pipeline_c2')
        self.assertEqual(pipeline_schedule.pipeline_uuid, 'test_pipeline_c2')

    def test_delete_block(self):
        pipeline = self.__create_pipeline_with_blocks('test pipeline 3')
        block = pipeline.blocks_by_uuid['block4']
        widget = pipeline.widgets_by_uuid['widget1']
        pipeline.delete_block(widget, widget=True)
        pipeline.delete_block(block)
        pipeline = Pipeline('test_pipeline_3', self.repo_path)
        self.assertEqual(pipeline.to_dict(), dict(
            data_integration=None,
            description=None,
            executor_config=dict(),
            executor_count=1,
            executor_type=None,
            name='test pipeline 3',
            notification_config=dict(),
            uuid='test_pipeline_3',
            tags=[],
            retry_config={},
            spark_config=dict(),
            type='python',
            blocks=[
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block1',
                    uuid='block1',
                    type='data_loader',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block2',
                    uuid='block2',
                    type='transformer',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=[],
                    all_upstream_blocks_executed=False,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block3',
                    uuid='block3',
                    type='transformer',
                    retry_config=None,
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=[],
                    all_upstream_blocks_executed=False,
                )
            ],
            callbacks=[],
            conditionals=[],
            updated_at=None,
            widgets=[],
        ))

    def test_execute(self):
        pipeline = Pipeline.create(
            'test pipeline 4',
            repo_path=self.repo_path,
        )
        block1 = self.__create_dummy_data_loader_block('block1', pipeline)
        block2 = self.__create_dummy_transformer_block('block2', pipeline)
        block3 = self.__create_dummy_transformer_block('block3', pipeline)
        block4 = self.__create_dummy_data_exporter_block('block4', pipeline)
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['block1'])
        pipeline.add_block(block3, upstream_block_uuids=['block1'])
        pipeline.add_block(block4, upstream_block_uuids=['block2', 'block3'])
        pipeline.execute_sync()
        self.assertEqual(pipeline.to_dict(), dict(
            data_integration=None,
            description=None,
            executor_config=dict(),
            executor_count=1,
            executor_type=None,
            name='test pipeline 4',
            notification_config=dict(),
            uuid='test_pipeline_4',
            tags=[],
            retry_config={},
            spark_config=dict(),
            type='python',
            blocks=[
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block1',
                    uuid='block1',
                    type='data_loader',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block2',
                    uuid='block2',
                    type='transformer',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block3',
                    uuid='block3',
                    type='transformer',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block4',
                    uuid='block4',
                    type='data_exporter',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block2', 'block3'],
                    downstream_blocks=[],
                    all_upstream_blocks_executed=True,
                )
            ],
            callbacks=[],
            conditionals=[],
            updated_at=None,
            widgets=[],
        ))

    def test_execute_multiple_paths(self):
        pipeline = Pipeline.create(
            'test pipeline 5',
            repo_path=self.repo_path,
        )
        block1 = self.__create_dummy_data_loader_block('block1', pipeline)
        block2 = self.__create_dummy_transformer_block('block2', pipeline)
        block3 = self.__create_dummy_transformer_block('block3', pipeline)
        block4 = self.__create_dummy_data_loader_block('block4', pipeline)
        block5 = self.__create_dummy_transformer_block('block5', pipeline)
        block6 = self.__create_dummy_transformer_block('block6', pipeline)
        block7 = self.__create_dummy_data_exporter_block('block7', pipeline)
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['block1'])
        pipeline.add_block(block3, upstream_block_uuids=['block1'])
        pipeline.add_block(block4)
        pipeline.add_block(block5, upstream_block_uuids=['block4'])
        pipeline.add_block(block6, upstream_block_uuids=['block5'])
        pipeline.add_block(block7, upstream_block_uuids=['block2', 'block3', 'block6'])
        pipeline.execute_sync()
        self.assertEqual(pipeline.to_dict(), dict(
            data_integration=None,
            description=None,
            executor_config=dict(),
            executor_count=1,
            executor_type=None,
            name='test pipeline 5',
            notification_config=dict(),
            uuid='test_pipeline_5',
            tags=[],
            retry_config={},
            spark_config=dict(),
            type='python',
            blocks=[
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block1',
                    uuid='block1',
                    type='data_loader',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block2',
                    uuid='block2',
                    type='transformer',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block7'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block3',
                    uuid='block3',
                    type='transformer',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block7'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block4',
                    uuid='block4',
                    type='data_loader',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=[],
                    downstream_blocks=['block5'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block5',
                    uuid='block5',
                    type='transformer',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block4'],
                    downstream_blocks=['block6'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block6',
                    uuid='block6',
                    type='transformer',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block5'],
                    downstream_blocks=['block7'],
                    all_upstream_blocks_executed=True,
                ),
                dict(
                    language='python',
                    color=None,
                    configuration={},
                    executor_config=None,
                    executor_type='local_python',
                    has_callback=False,
                    name='block7',
                    uuid='block7',
                    type='data_exporter',
                    retry_config=None,
                    status='executed',
                    upstream_blocks=['block2', 'block3', 'block6'],
                    downstream_blocks=[],
                    all_upstream_blocks_executed=True,
                )
            ],
            callbacks=[],
            conditionals=[],
            updated_at=None,
            widgets=[],
        ))

    def test_delete(self):
        pipeline = Pipeline.create(
            'test pipeline 6',
            repo_path=self.repo_path,
        )
        block1 = self.__create_dummy_data_loader_block('block1', pipeline)
        block2 = self.__create_dummy_transformer_block('block2', pipeline)
        block3 = self.__create_dummy_data_exporter_block('block3', pipeline)
        block4 = self.__create_dummy_scratchpad('block4', pipeline)
        block5 = self.__create_dummy_scratchpad('block5', pipeline)
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['block1'])
        pipeline.add_block(block3, upstream_block_uuids=['block2'])
        pipeline.add_block(block4)
        pipeline.add_block(block5)
        pipeline.delete()
        self.assertFalse(os.access(pipeline.dir_path, os.F_OK))
        self.assertTrue(os.access(block1.file_path, os.F_OK))
        self.assertTrue(os.access(block2.file_path, os.F_OK))
        self.assertTrue(os.access(block3.file_path, os.F_OK))
        self.assertFalse(os.access(block4.file_path, os.F_OK))
        self.assertFalse(os.access(block5.file_path, os.F_OK))

    def test_duplicate_standard_pipeline(self):
        pipeline = self.__create_pipeline_with_blocks('test_pipeline_7a')
        duplicate_pipeline = Pipeline.duplicate(pipeline, 'duplicate_pipeline')
        for block_uuid in pipeline.blocks_by_uuid:
            original = pipeline.blocks_by_uuid[block_uuid]
            duplicate = duplicate_pipeline.blocks_by_uuid[block_uuid]
            self.assertEqual(original.name, duplicate.name)
            self.assertEqual(original.uuid, duplicate.uuid)
            self.assertEqual(original.type, duplicate.type)
            self.assertEqual(original.upstream_block_uuids, duplicate.upstream_block_uuids)
            self.assertEqual(original.downstream_block_uuids, duplicate.downstream_block_uuids)
        for widget_uuid in pipeline.widgets_by_uuid:
            original = pipeline.widgets_by_uuid[widget_uuid]
            duplicate = duplicate_pipeline.widgets_by_uuid[widget_uuid]
            self.assertEqual(original.name, duplicate.name)
            self.assertEqual(original.uuid, duplicate.uuid)
            self.assertEqual(original.type, duplicate.type)
            self.assertEqual(original.chart_type, duplicate.chart_type)
            self.assertEqual(original.upstream_block_uuids, duplicate.upstream_block_uuids)

    def test_duplicate_integration_pipeline(self):
        pipeline = self.__create_pipeline_with_integration('test_pipeline_7b')
        duplicate_pipeline = Pipeline.duplicate(pipeline, 'duplicate_pipeline_2')
        for block_uuid in pipeline.blocks_by_uuid:
            original = pipeline.blocks_by_uuid[block_uuid]
            duplicate = duplicate_pipeline.blocks_by_uuid[block_uuid]
            self.assertEqual(original.name, duplicate.name)
            self.assertEqual(original.uuid, duplicate.uuid)
            self.assertEqual(original.type, duplicate.type)
            self.assertEqual(original.upstream_block_uuids, duplicate.upstream_block_uuids)
            self.assertEqual(original.downstream_block_uuids, duplicate.downstream_block_uuids)
            self.assertEqual(pipeline.data_integration, duplicate_pipeline.data_integration)

    def test_cycle_detection(self):
        pipeline = self.__create_pipeline_with_blocks('test pipeline 8')
        pipeline.validate()

        block_new = Block.create('block_new', 'transformer', self.repo_path)
        block_new.downstream_blocks = pipeline.get_blocks(['block1', 'block2'])
        with self.assertRaises(InvalidPipelineError):
            pipeline.add_block(block_new, upstream_block_uuids=['block4'])
        block_new.downstream_blocks = pipeline.get_blocks(['block2'])
        with self.assertRaises(InvalidPipelineError):
            pipeline.add_block(block_new, upstream_block_uuids=['block4'])

        block4 = pipeline.get_block('block4')
        block4.downstream_blocks = pipeline.get_blocks(['block1', 'block2'])
        with self.assertRaises(InvalidPipelineError):
            pipeline.update_block(block4)

    def test_save_and_get_data_integration_catalog(self):
        pipeline = self.__create_pipeline_with_integration('test_pipeline_9')
        pipeline.save()
        catalog_config_path = os.path.join(
            self.repo_path,
            'pipelines/test_pipeline_9/data_integration_catalog.json',
        )
        self.assertEqual(pipeline.catalog_config_path, catalog_config_path)
        self.assertTrue(os.path.exists(catalog_config_path))
        expected_catalog_config = {
            'catalog': {
                'streams': [
                    {
                        'tap_stream_id': 'demo_users',
                        'stream': 'demo_users',
                    },
                ],
            }
        }
        with open(catalog_config_path) as f:
            catalog_json = json.load(f)
            self.assertEqual(catalog_json, expected_catalog_config)
        self.assertTrue(os.path.exists(pipeline.config_path))
        with open(pipeline.config_path) as f:
            config_json = yaml.full_load(f)
            self.assertEqual(
                config_json,
                dict(
                    data_integration=None,
                    description=None,
                    executor_config={},
                    executor_count=1,
                    executor_type=None,
                    extensions={},
                    name='test_pipeline_9',
                    notification_config={},
                    tags=[],
                    retry_config={},
                    spark_config={},
                    type='integration',
                    updated_at=None,
                    uuid='test_pipeline_9',
                    blocks=[
                        dict(
                            all_upstream_blocks_executed=True,
                            color=None,
                            configuration={},
                            downstream_blocks=['destination_block'],
                            executor_config=None,
                            executor_type='local_python',
                            has_callback=False,
                            name='source_block',
                            language='python',
                            retry_config=None,
                            status='not_executed',
                            type='data_loader',
                            upstream_blocks=[],
                            uuid='source_block',
                        ),
                        dict(
                            all_upstream_blocks_executed=False,
                            color=None,
                            configuration={},
                            downstream_blocks=[],
                            executor_config=None,
                            executor_type='local_python',
                            has_callback=False,
                            name='destination_block',
                            language='python',
                            retry_config=None,
                            status='not_executed',
                            type='transformer',
                            upstream_blocks=['source_block'],
                            uuid='destination_block',
                        ),
                    ],
                    callbacks=[],
                    conditionals=[],
                    widgets=[],
                ),
            )
        pipeline_load = Pipeline.get('test_pipeline_9')
        self.assertEqual(pipeline_load.to_dict()['data_integration'], expected_catalog_config)

    def test_save_and_get_integration_pipeline_async(self):
        pipeline = self.__create_pipeline_with_integration('test_pipeline_10')
        asyncio.run(pipeline.save_async())

        pipeline_load = asyncio.run(Pipeline.get_async('test_pipeline_10'))
        self.assertEqual(
            pipeline_load.to_dict()['data_integration'],
            {
                'catalog': {
                    'streams': [
                        {
                            'tap_stream_id': 'demo_users',
                            'stream': 'demo_users',
                        },
                    ],
                }
            },
        )
        self.assertEqual(
            pipeline_load.to_dict(),
            pipeline.to_dict(),
        )

    def test_save_with_empty_content(self):
        pipeline = self.__create_pipeline_with_blocks('test pipeline 11')
        with patch.object(pipeline, 'to_dict', return_value=dict()):
            with self.assertRaises(Exception) as err:
                pipeline.save()
            self.assertTrue('Writing empty pipeline metadata is prevented.' in str(err.exception))

    def __create_pipeline_with_blocks(self, name):
        pipeline = Pipeline.create(
            name,
            repo_path=self.repo_path,
        )
        block1 = Block.create('block1', 'data_loader', self.repo_path, language='python')
        block2 = Block.create('block2', 'transformer', self.repo_path, language='python')
        block3 = Block.create('block3', 'transformer', self.repo_path, language='python')
        block4 = Block.create('block4', 'data_exporter', self.repo_path, language='python')
        widget1 = Widget.create('widget1', 'chart', self.repo_path, language='python')
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['block1'])
        pipeline.add_block(block3, upstream_block_uuids=['block1'])
        pipeline.add_block(block4, upstream_block_uuids=['block2', 'block3'])
        pipeline.add_block(widget1, upstream_block_uuids=['block4'], widget=True)
        return pipeline

    def __create_pipeline_with_integration(self, name):
        pipeline = Pipeline.create(
            name,
            pipeline_type=PipelineType.INTEGRATION,
            repo_path=self.repo_path,
        )
        source_block = Block.create(
            'source_block',
            'data_loader',
            self.repo_path,
            language='python',
        )
        destination_block = Block.create(
            'destination_block',
            'transformer',
            self.repo_path,
            language='python',
        )
        pipeline.add_block(source_block)
        pipeline.add_block(destination_block, upstream_block_uuids=['source_block'])
        pipeline.data_integration = {
            'catalog': {
                'streams': [
                    {
                        'tap_stream_id': 'demo_users',
                        'stream': 'demo_users',
                    },
                ],
            },
        }
        return pipeline

    def __create_dummy_data_loader_block(self, name, pipeline):
        block = Block.create(
            name,
            'data_loader',
            self.repo_path,
            pipeline=pipeline,
            language='python',
        )
        with open(block.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_loader
def load_data():
    data = {'col1': [1, 1, 3], 'col2': [2, 2, 4]}
    df = pd.DataFrame(data)
    return [df]
            ''')
        return block

    def __create_dummy_transformer_block(self, name, pipeline):
        block = Block.create(
            name,
            'transformer',
            self.repo_path,
            pipeline=pipeline,
            language='python',
        )
        with open(block.file_path, 'w') as file:
            file.write('''import pandas as pd
@transformer
def transform(df):
    return df
            ''')
        return block

    def __create_dummy_data_exporter_block(self, name, pipeline):
        block = Block.create(
            name,
            'data_exporter',
            self.repo_path,
            pipeline=pipeline,
            language='python',
        )
        with open(block.file_path, 'w') as file:
            file.write('''import pandas as pd
@data_exporter
def export_data(df, *args):
    return None
            ''')
        return block

    def __create_dummy_scratchpad(self, name, pipeline):
        block = Block.create(
            name,
            'scratchpad',
            self.repo_path,
            pipeline=pipeline,
            language='python',
        )
        with open(block.file_path, 'w') as file:
            file.write(
                '''import antigravity
            '''
            )
        return block
