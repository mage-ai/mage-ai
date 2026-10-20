import asyncio
from unittest.mock import MagicMock

from mage_ai.ai.llm_pipeline_wizard import LLMPipelineWizard
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import TestCase

EXPECTED_RESPONSE_FOR_LLM_SPLIT = """
Answer:
BLOCK 1: function: load data from MySQL. upstream:
BLOCK 2: function: filter out records column age < 18. upstream: 1
BLOCK 3: function: export it to postgres. upstream: 2"""
EXPECTED_LOAD_BLOCK = '{"code": "load mysql"}'
EXPECTED_FILTER_BLOCK = '{"code": "filter record"}'
EXPECTED_EXPORT_BLOCK = '{"code": "export postgres"}'


class AIFunctionTest(TestCase):
    def setUp(self):
        self.error = None
        try:
            self.wizard = LLMPipelineWizard()
            self.pipeline = Pipeline.create('test_pipeline', repo_path='test')
            self.block = Block.create(name="test_block", block_type="data_loader", repo_path="test")
            self.pipeline.add_block(self.block)
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
        except Exception as err:
            print(f'[WARNING] AIFunctionTest.setUp: {err}')
            self.error = err

            return

    def tearDown(self):
        if hasattr(self, 'pipeline'):
            self.pipeline.delete()

        if hasattr(self, 'loop'):
            self.loop.close()

    def __set_expected_future_result(self, expected_value):
        result_holder = asyncio.Future()
        result_holder.set_result(expected_value)
        return result_holder

    def test_async_generate_pipeline_from_description(self):
        if self.error:
            print(
                '[WARNING] AIFunctionTest.test_async_generate_pipeline_from_description '
                f'skipping test: {self.error}.',
            )
            return

        mock_customized_code = self.__set_expected_future_result({"action_code": "filter"})
        self.wizard.client.inference_with_prompt = MagicMock(
            side_effect=[self.__set_expected_future_result(EXPECTED_RESPONSE_FOR_LLM_SPLIT),
                         mock_customized_code,
                         mock_customized_code,
                         mock_customized_code])
        self.wizard.client.find_block_params = MagicMock(
            side_effect=[
                self.__set_expected_future_result(({
                    'block_type': 'data_loader',
                    'block_language': 'python',
                    'pipeline_type': 'python',
                    'config': {'data_source': 'mysql'}
                })),
                self.__set_expected_future_result(({
                    'block_type': 'transformer',
                    'block_language': 'python',
                    'pipeline_type': 'python',
                    'config': {'action_type': 'filter'}
                })),
                self.__set_expected_future_result(({
                    'block_type': 'data_exporter',
                    'block_language': 'python',
                    'pipeline_type': 'python',
                    'config': {'data_source': 'postgres'}
                }))]
        )

        pipeine_description = 'load data from mysql, filter out \
            records column age < 18, export it to postgres'
        blocks = asyncio.run(self.wizard.async_generate_pipeline_from_description(
            pipeine_description))
        loader_block = blocks.get('1')
        self.assertEqual(loader_block.get('block_type'), 'data_loader')
        self.assertEqual(loader_block.get('configuration').get('data_source'), 'mysql')
        transformer_block = blocks.get('2')
        self.assertEqual(transformer_block.get('block_type'), 'transformer')
        self.assertEqual(transformer_block.get('configuration').get('action_type'), 'filter')
        self.assertTrue('1' in transformer_block.get('upstream_blocks'))
        exporter_block = blocks.get('3')
        self.assertEqual(exporter_block.get('block_type'), 'data_exporter')
        self.assertEqual(exporter_block.get('configuration').get('data_source'), 'postgres')
        self.assertTrue('2' in exporter_block.get('upstream_blocks'))

    def test_async_generate_block_with_description(self):
        if self.error:
            print(
                '[WARNING] AIFunctionTest.test_async_generate_block_with_description '
                f'skipping test: {self.error}.',
            )
            return

        upstream_blocks = [1, 2, 3]
        customized_code = {'code': 'Test code'}
        self.wizard.client.inference_with_prompt = MagicMock(
            return_value=self.__set_expected_future_result(customized_code))
        self.wizard.client.find_block_params = MagicMock(
            side_effect=[
                self.__set_expected_future_result(({
                    'block_type': 'transformer',
                    'block_language': 'python',
                    'pipeline_type': 'python',
                    'config': {'action_type': 'filter'}
                }))])
        block = asyncio.run(self.wizard.async_generate_block_with_description(
            'test block generation', upstream_blocks))
        self.assertEqual(block.get('block_type'), 'transformer')
        self.assertEqual(block.get('configuration').get('action_type'), 'filter')
        self.assertListEqual(upstream_blocks, block.get('upstream_blocks'))

    def test_async_generate_comment_for_block(self):
        if self.error:
            print(
                '[WARNING] AIFunctionTest.test_async_generate_comment_for_block '
                f'skipping test: {self.error}.',
            )
            return

        comment_line = 'Return the sum of 1 + 1'
        function_name = 'calculator_function'
        function_comments = {f'{function_name}': comment_line}
        self.wizard.client.inference_with_prompt = MagicMock(
            return_value=self.__set_expected_future_result(function_comments))
        block = asyncio.run(self.wizard.async_generate_comment_for_block(
            f'def {function_name}(self): \n    return 1+1'))
        self.assertTrue(comment_line in block)

    def test_async_generate_doc_for_block(self):
        if self.error:
            print(
                '[WARNING] AIFunctionTest.test_async_generate_doc_for_block '
                f'skipping test: {self.error}.',
            )
            return

        expected_value = 'documentation'
        self.wizard.client.inference_with_prompt = MagicMock(
            return_value=self.__set_expected_future_result(expected_value))

        block_doc = asyncio.run(self.wizard.async_generate_doc_for_block(
            self.pipeline.uuid, self.block.uuid))
        self.assertEqual(expected_value, block_doc)

    def test_async_generate_doc_for_pipeline(self):
        if self.error:
            print(
                '[WARNING] AIFunctionTest.test_async_generate_doc_for_pipeline '
                f'skipping test: {self.error}.',
            )
            return

        expected_value = 'documentation'
        self.wizard.client.inference_with_prompt = MagicMock(
            return_value=self.__set_expected_future_result(expected_value))

        doc_dict = asyncio.run(self.wizard.async_generate_doc_for_pipeline(
            self.pipeline.uuid))
        self.assertEqual(expected_value, doc_dict.get('pipeline_doc'))
        self.assertTrue(expected_value in doc_dict.get('block_docs'))
