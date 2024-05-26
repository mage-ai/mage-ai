# import inspect
# from typing import Callable, Optional

# from mage_ai.data_preparation.models.block import Block
# from mage_ai.data_preparation.models.block.dynamic.counter import (
#     dynamic_child_output_item_count,
#     dynamic_output_item_count,
#     multi_dynamic_output_item_count,
# )
# from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
# from mage_ai.tests.api.operations.test_base import BaseApiTestCase
# from mage_ai.tests.factory import create_pipeline


# class DynamicBlockCounterTest(BaseApiTestCase):
#     def setUp(self):
#         super().setUp()
#         self.pipeline = create_pipeline(self.faker.unique.name(), self.repo_path)

#     def create_block(
#         self,
#         name: Optional[str] = None,
#         content: Optional[str] = None,
#         func: Optional[Callable] = None,
#         **kwargs,
#     ) -> Block:
#         block = Block.create(
#             name or self.faker.unique.name(),
#             BlockType.TRANSFORMER,
#             self.pipeline.repo_path,
#             language=BlockLanguage.PYTHON,
#             **kwargs,
#         )

#         if func:
#             content = inspect.getsource(func)

#         if content:
#             block.update_content(
#                 '\n'.join([
#                     'from mage_ai.data.tabular.mocks import create_dataframe',
#                     f'@{block.type}',
#                     content,
#                 ])
#             )

#         return block

#     def test_dynamic_output_item_count_when_statistics_file_exists(self):
#         for row_count, func in [
#             (1_000, export_pandas),
#             (2_000, export_pandas_series),
#             (3_000, export_polars),
#             (4_000, export_polars_series),
#             (5_000, export_iterable),
#             (6_000, export_matrix_sparse),
#             ((1_000 * sum([i + 1 for i in range(6)]) + 10), export_list_complex),
#         ]:
#             block = self.create_block(func=func)
#             self.pipeline.add_block(block)
#             block.execute_sync()

#             self.assertEqual(dynamic_output_item_count(block), row_count)
