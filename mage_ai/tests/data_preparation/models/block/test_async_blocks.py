import asyncio
import unittest
from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.models.block import Block, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import DBTestCase


class AsyncBlockFunctionTest(DBTestCase):
    def _make_block(self, block_name, block_type, pipeline, content, upstream_uuids=None):
        block = Block.create(
            block_name,
            block_type,
            self.repo_path,
            pipeline=pipeline,
            upstream_block_uuids=upstream_uuids or [],
        )
        with open(block.file_path, 'w') as f:
            f.write(content)
        return block

    def test_execute_block_function_async_basic(self):
        block = Block.create('test_async_ebf', 'transformer', self.repo_path)

        async def my_transform(df):
            return df * 2

        result = asyncio.run(
            block.execute_block_function(my_transform, [10])
        )
        self.assertEqual(result, 20)

    def test_execute_block_function_sync_unchanged(self):
        block = Block.create('test_sync_ebf', 'transformer', self.repo_path)

        def my_transform(df):
            return df * 3

        result = asyncio.run(
            block.execute_block_function(my_transform, [5])
        )
        self.assertEqual(result, 15)

    def test_execute_block_function_async_with_kwargs(self):
        block = Block.create('test_async_kwargs', 'transformer', self.repo_path)

        async def my_transform(df, **kwargs):
            multiplier = kwargs.get('multiplier', 1)
            return df * multiplier

        result = asyncio.run(
            block.execute_block_function(
                my_transform,
                [4],
                global_vars={'multiplier': 5},
            )
        )
        self.assertEqual(result, 20)

    def test_execute_block_function_async_await_inside(self):
        block = Block.create('test_async_await_inner', 'transformer', self.repo_path)

        async def fetch_from_async_sdk(value):
            await asyncio.sleep(0)  
            return value + 100

        async def my_transform(df):
            result = await fetch_from_async_sdk(df)
            return result

        result = asyncio.run(
            block.execute_block_function(my_transform, [42])
        )
        self.assertEqual(result, 142)

    def test_execute_block_function_async_returns_list(self):
        block = Block.create('test_async_returns_list', 'transformer', self.repo_path)

        async def my_transform(df):
            await asyncio.sleep(0)
            return [df, df + 1]

        result = asyncio.run(
            block.execute_block_function(my_transform, [10])
        )
        self.assertEqual(result, [10, 11])

    def test_pipeline_async_data_loader(self):
        pipeline = Pipeline.create('test_async_loader_pipeline', repo_path=self.repo_path)

        loader_content = """\
@data_loader
async def load_data():
    import asyncio
    await asyncio.sleep(0)
    return [42]
"""
        block = self._make_block(
            'async_loader', 'data_loader', pipeline, loader_content
        )

        asyncio.run(block.execute(analyze_outputs=False))
        self.assertEqual(block.status, 'executed')

    def test_pipeline_async_transformer_receives_upstream_output(self):
        pipeline = Pipeline.create(
            'test_async_transformer_pipeline', repo_path=self.repo_path
        )

        loader_content = """\
@data_loader
def load_data():
    return [10]
"""
        transformer_content = """\
@transformer
async def transform(value):
    import asyncio
    await asyncio.sleep(0)
    return [value * 2]
"""
        loader = self._make_block('sync_loader', 'data_loader', pipeline, loader_content)
        transformer = self._make_block(
            'async_transformer',
            'transformer',
            pipeline,
            transformer_content,
            upstream_uuids=['sync_loader'],
        )

        asyncio.run(loader.execute(analyze_outputs=False))
        asyncio.run(transformer.execute(analyze_outputs=False, run_all_blocks=True))
        self.assertEqual(transformer.status, 'executed')

    def test_pipeline_sync_transformer_after_async_loader(self):
        pipeline = Pipeline.create(
            'test_sync_after_async_pipeline', repo_path=self.repo_path
        )

        loader_content = """\
@data_loader
async def load_data():
    import asyncio
    await asyncio.sleep(0)
    return [7]
"""
        transformer_content = """\
@transformer
def transform(value):
    return [value + 1]
"""
        loader = self._make_block('async_loader2', 'data_loader', pipeline, loader_content)
        transformer = self._make_block(
            'sync_transformer2',
            'transformer',
            pipeline,
            transformer_content,
            upstream_uuids=['async_loader2'],
        )

        asyncio.run(loader.execute(analyze_outputs=False))
        asyncio.run(transformer.execute(analyze_outputs=False, run_all_blocks=True))
        self.assertEqual(transformer.status, 'executed')

    def test_execute_sync_with_async_block(self):
        pipeline = Pipeline.create(
            'test_execute_sync_async_pipeline', repo_path=self.repo_path
        )

        loader_content = """\
@data_loader
async def load_data():
    import asyncio
    await asyncio.sleep(0)
    return [99]
"""
        block = self._make_block(
            'async_loader_sync_path', 'data_loader', pipeline, loader_content
        )

        block.execute_sync(analyze_outputs=False, run_all_blocks=True)
        self.assertEqual(block.status, 'executed')

    def test_async_block_exception_propagates(self):
        block = Block.create('test_async_exc', 'transformer', self.repo_path)

        async def failing_transform(df):
            await asyncio.sleep(0)
            raise ValueError('async block error')

        with self.assertRaises(ValueError) as ctx:
            asyncio.run(block.execute_block_function(failing_transform, [1]))

        self.assertIn('async block error', str(ctx.exception))


if __name__ == '__main__':
    unittest.main()
