from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import TestCase
import asyncio
import os
import shutil


class PipelineTest(TestCase):
    def setUp(self):
        self.repo_path = os.getcwd() + '/test'
        if not os.path.exists(self.repo_path):
            os.mkdir(self.repo_path)
        return super().setUp()

    def tearDown(self):
        shutil.rmtree(self.repo_path)
        return super().tearDown()

    def test_create(self):
        pipeline = Pipeline.create('test pipeline', self.repo_path)
        self.assertEqual(pipeline.uuid, 'test_pipeline')
        self.assertEqual(pipeline.name, 'test pipeline')
        self.assertEqual(pipeline.blocks_by_uuid, dict())
        self.assertTrue(os.path.exists(f'{self.repo_path}/pipelines/test_pipeline/__init__.py'))
        self.assertTrue(os.path.exists(f'{self.repo_path}/pipelines/test_pipeline/requirements.txt'))
        self.assertTrue(os.path.exists(f'{self.repo_path}/pipelines/test_pipeline/metadata.yaml'))

    def test_add_block(self):
        self.__create_pipeline_with_blocks('test pipeline 2')
        pipeline = Pipeline('test_pipeline_2', self.repo_path)
        self.assertEquals(pipeline.to_dict(), dict(
            name='test pipeline 2',
            uuid='test_pipeline_2',
            blocks=[
                dict(
                    name='block1',
                    uuid='block1',
                    type='data_loader',
                    status='not_executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                ),
                dict(
                    name='block2',
                    uuid='block2',
                    type='transformer',
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                ),
                dict(
                    name='block3',
                    uuid='block3',
                    type='transformer',
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                ),
                dict(
                    name='block4',
                    uuid='block4',
                    type='data_exporter',
                    status='not_executed',
                    upstream_blocks=['block2', 'block3'],
                    downstream_blocks=[],
                )
            ]
        ))

    def test_remove_block(self):
        pipeline = self.__create_pipeline_with_blocks('test pipeline 3')
        block = pipeline.blocks_by_uuid['block4']
        pipeline.remove_block(block)
        pipeline = Pipeline('test_pipeline_3', self.repo_path)
        self.assertEquals(pipeline.to_dict(), dict(
            name='test pipeline 3',
            uuid='test_pipeline_3',
            blocks=[
                dict(
                    name='block1',
                    uuid='block1',
                    type='data_loader',
                    status='not_executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                ),
                dict(
                    name='block2',
                    uuid='block2',
                    type='transformer',
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=[],
                ),
                dict(
                    name='block3',
                    uuid='block3',
                    type='transformer',
                    status='not_executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=[],
                )
            ]
        ))

    def test_execute(self):
        pipeline = Pipeline.create('test pipeline 3', self.repo_path)
        block1 = Block.create('block1', 'scratchpad', self.repo_path)
        block2 = Block.create('block2', 'scratchpad', self.repo_path)
        block3 = Block.create('block3', 'scratchpad', self.repo_path)
        block4 = Block.create('block4', 'scratchpad', self.repo_path)
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['block1'])
        pipeline.add_block(block3, upstream_block_uuids=['block1'])
        pipeline.add_block(block4, upstream_block_uuids=['block2', 'block3'])
        asyncio.run(pipeline.execute())
        self.assertEquals(pipeline.to_dict(), dict(
            name='test pipeline 3',
            uuid='test_pipeline_3',
            blocks=[
                dict(
                    name='block1',
                    uuid='block1',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                ),
                dict(
                    name='block2',
                    uuid='block2',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                ),
                dict(
                    name='block3',
                    uuid='block3',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block4'],
                ),
                dict(
                    name='block4',
                    uuid='block4',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block2', 'block3'],
                    downstream_blocks=[],
                )
            ]
        ))

    def test_execute_multiple_paths(self):
        pipeline = Pipeline.create('test pipeline 4', self.repo_path)
        block1 = Block.create('block1', 'scratchpad', self.repo_path)
        block2 = Block.create('block2', 'scratchpad', self.repo_path)
        block3 = Block.create('block3', 'scratchpad', self.repo_path)
        block4 = Block.create('block4', 'scratchpad', self.repo_path)
        block5 = Block.create('block5', 'scratchpad', self.repo_path)
        block6 = Block.create('block6', 'scratchpad', self.repo_path)
        block7 = Block.create('block7', 'scratchpad', self.repo_path)
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['block1'])
        pipeline.add_block(block3, upstream_block_uuids=['block1'])
        pipeline.add_block(block4)
        pipeline.add_block(block5, upstream_block_uuids=['block4'])
        pipeline.add_block(block6, upstream_block_uuids=['block5'])
        pipeline.add_block(block7, upstream_block_uuids=['block2', 'block3', 'block6'])
        asyncio.run(pipeline.execute())
        self.assertEquals(pipeline.to_dict(), dict(
            name='test pipeline 4',
            uuid='test_pipeline_4',
            blocks=[
                dict(
                    name='block1',
                    uuid='block1',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=[],
                    downstream_blocks=['block2', 'block3'],
                ),
                dict(
                    name='block2',
                    uuid='block2',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block7'],
                ),
                dict(
                    name='block3',
                    uuid='block3',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block1'],
                    downstream_blocks=['block7'],
                ),
                dict(
                    name='block4',
                    uuid='block4',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=[],
                    downstream_blocks=['block5'],
                ),
                dict(
                    name='block5',
                    uuid='block5',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block4'],
                    downstream_blocks=['block6'],
                ),
                dict(
                    name='block6',
                    uuid='block6',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block5'],
                    downstream_blocks=['block7'],
                ),
                dict(
                    name='block7',
                    uuid='block7',
                    type='scratchpad',
                    status='executed',
                    upstream_blocks=['block2', 'block3', 'block6'],
                    downstream_blocks=[],
                )
            ]
        ))

    def __create_pipeline_with_blocks(self, name):
        pipeline = Pipeline.create(name, self.repo_path)
        block1 = Block.create('block1', 'data_loader', self.repo_path)
        block2 = Block.create('block2', 'transformer', self.repo_path)
        block3 = Block.create('block3', 'transformer', self.repo_path)
        block4 = Block.create('block4', 'data_exporter', self.repo_path)
        pipeline.add_block(block1)
        pipeline.add_block(block2, upstream_block_uuids=['block1'])
        pipeline.add_block(block3, upstream_block_uuids=['block1'])
        pipeline.add_block(block4, upstream_block_uuids=['block2', 'block3'])
        return pipeline
