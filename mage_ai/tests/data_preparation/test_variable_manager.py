# import asyncio
# import os
# from unittest.mock import patch

# import pandas as pd
# from pandas.testing import assert_frame_equal

# from mage_ai.data_preparation.models.block import Block
# from mage_ai.data_preparation.models.pipeline import Pipeline
# from mage_ai.data_preparation.models.variables.constants import VariableType
# from mage_ai.data_preparation.repo_manager import get_repo_config
# from mage_ai.data_preparation.variable_manager import (
#     VariableManager,
#     get_global_variable,
#     get_global_variables,
#     set_global_variable,
# )
# from mage_ai.settings.repo import set_repo_path
# from mage_ai.tests.base_test import DBTestCase
# from mage_ai.tests.shared.mixins import ProjectPlatformMixin


# class VariableManagerTest(DBTestCase):
#     def setUp(self):
#         self.repo_path = "/tmp/mage_test_repo"
#         self.variables_dir = os.path.join(self.repo_path, "variables")
#         self.manager = VariableManager(
#             repo_path=self.repo_path, variables_dir=self.variables_dir
#         )

#     def test_add_and_get_variable(self):
#         self.__create_pipeline("test pipeline 1")
#         variable_manager = VariableManager(
#             variables_dir=get_repo_config(self.repo_path).variables_dir,
#         )
#         data1 = {"k1": "v1", "k2": "v2"}
#         data2 = pd.DataFrame(
#             [
#                 ["test1", 1],
#                 ["test2", 2],
#             ],
#             columns=["col1", "col2"],
#         )
#         data3 = dict(
#             metadata=dict(
#                 column_types=dict(
#                     col1="number",
#                     col2="text",
#                 ),
#             ),
#             statistics=dict(
#                 count=100,
#                 count_distinct=50,
#             ),
#             insights=dict(),
#             suggestions=[
#                 dict(
#                     title="Remove outliers",
#                 )
#             ],
#         )
#         variable_manager.add_variable("test_pipeline_1", "block1", "var1", data1)
#         variable_manager.add_variable("test_pipeline_1", "block2", "var2", data2)
#         variable_manager.add_variable(
#             "test_pipeline_1",
#             "block2",
#             "var2",
#             data3,
#             variable_type=VariableType.DATAFRAME_ANALYSIS,
#         )
#         self.assertEqual(
#             variable_manager.get_variable("test_pipeline_1", "block1", "var1"),
#             data1,
#         )
#         assert_frame_equal(
#             variable_manager.get_variable("test_pipeline_1", "block2", "var2"),
#             data2,
#         )
#         self.assertEqual(
#             variable_manager.get_variable(
#                 "test_pipeline_1",
#                 "block2",
#                 "var2",
#                 variable_type=VariableType.DATAFRAME_ANALYSIS,
#             ),
#             data3,
#         )

#     def test_get_variables_by_pipeline(self):
#         self.__create_pipeline("test pipeline 2")
#         variable_manager = VariableManager(
#             repo_path=self.repo_path,
#             variables_dir=get_repo_config(self.repo_path).variables_dir,
#         )
#         variable_manager.add_variable("test_pipeline_2", "block1", "var1", 1)
#         variable_manager.add_variable("test_pipeline_2", "block1", "var2", 2)
#         variable_manager.add_variable("test_pipeline_2", "block2", "var3", 3)
#         variable_manager.add_variable("test_pipeline_2", "block2", "var4", 4)
#         self.assertEqual(
#             variable_manager.get_variables_by_pipeline("test_pipeline_2"),
#             dict(block1=["var1", "var2"], block2=["var3", "var4"]),
#         )

#     def test_set_and_get_global_variable(self):
#         set_repo_path(self.repo_path)
#         self.__create_pipeline("test pipeline 3")
#         set_global_variable("test_pipeline_3", "var1", 1)
#         set_global_variable("test_pipeline_3", "var2", "test")
#         set_global_variable("test_pipeline_3", "var3", [1, 2, 3])
#         set_global_variable("test_pipeline_3", "var4", dict(k1="v1", k2="v2"))
#         self.assertEqual(get_global_variable("test_pipeline_3", "var1"), 1)
#         self.assertEqual(get_global_variable("test_pipeline_3", "var2"), "test")
#         self.assertEqual(get_global_variable("test_pipeline_3", "var3"), [1, 2, 3])
#         self.assertEqual(
#             get_global_variable("test_pipeline_3", "var4"), dict(k1="v1", k2="v2")
#         )

#     def __create_pipeline(self, name):
#         pipeline = Pipeline.create(
#             name,
#             repo_path=self.repo_path,
#         )
#         block1 = Block.create("block1", "data_loader", self.repo_path)
#         block2 = Block.create("block2", "transformer", self.repo_path)
#         pipeline.add_block(block1)
#         pipeline.add_block(block2)
#         return pipeline

#     def test_get_global_variables(self):
#         pipeline = Pipeline.create(
#             self.faker.unique.name(),
#             repo_path=self.repo_path,
#         )
#         pipeline.variables = self.faker.unique.name()
#         pipeline.save()
#         self.assertEqual(
#             get_global_variables(None, pipeline=pipeline), pipeline.variables
#         )
#         self.assertEqual(get_global_variables(pipeline.uuid), pipeline.variables)

#     @patch("mage_ai.data_preparation.variable_manager.LocalStorage")
#     def test_add_and_get_variable_dataframe(self, mock_storage):
#         # Setup
#         pipeline_uuid = "test_pipeline"
#         block_uuid = "test_block"
#         variable_uuid = "test_variable_df"
#         test_data = pd.DataFrame({"column1": [1, 2, 3]})

#         # Simulate adding variable
#         self.manager.add_variable(pipeline_uuid, block_uuid, variable_uuid, test_data)

#         # Ensure write_data is called with correct data
#         args, kwargs = mock_storage.return_value.write_data.call_args
#         written_data = args[0]
#         self.assertTrue((written_data == test_data).all().all())

#         # Simulate getting variable
#         mock_storage.return_value.read_data.return_value = test_data
#         retrieved_data = self.manager.get_variable(
#             pipeline_uuid, block_uuid, variable_uuid
#         )

#         # Ensure read_data is called and data is correctly retrieved
#         self.assertTrue((retrieved_data == test_data).all().all())

#     @patch("mage_ai.data_preparation.variable_manager.LocalStorage")
#     def test_delete_variable(self, mock_storage):
#         # Setup
#         pipeline_uuid = "test_pipeline_del"
#         block_uuid = "test_block_del"
#         variable_uuid = "test_variable_del"

#         # Simulate deletion
#         self.manager.delete_variable(pipeline_uuid, block_uuid, variable_uuid)

#         # Ensure remove_file is called with correct filepath
#         mock_storage.return_value.remove_file.assert_called_once()
#         args, _ = mock_storage.return_value.remove_file.call_args
#         self.assertIn(variable_uuid, args[0])

#     @patch("mage_ai.data_preparation.variable_manager.LocalStorage")
#     def test_clean_variables(self, mock_storage):
#         # Mocking directories and variables
#         pipeline_uuid = "test_pipeline_clean"
#         self.manager.clean_variables(pipeline_uuid)

#         # Ensure remove_dir is called for cleaning
#         self.assertTrue(mock_storage.return_value.remove_dir.called)

#     def test_add_variable_with_invalid_data_type(self):
#         pipeline_uuid = "pipeline_uuid"
#         block_uuid = "block_uuid"
#         variable_uuid = "invalid_data_variable"
#         test_data = {
#             "unsupported": set([1, 2, 3])
#         }  # using a set, which is typically not serializable

#         with self.assertRaises(ValueError):
#             self.manager.add_variable(
#                 pipeline_uuid, block_uuid, variable_uuid, test_data
#             )

#     @patch("mage_ai.data_preparation.variable_manager.S3Client")
#     def test_add_and_get_variable_s3(self, mock_s3_client):
#         pipeline_uuid = "pipeline_s3"
#         block_uuid = "block_s3"
#         variable_uuid = "s3_variable_df"
#         test_data = pd.DataFrame({"col1": [1, 2, 3], "col2": ["x", "y", "z"]})

#         s3_manager = VariableManager(storage_backend="s3", s3_bucket_name="test_bucket")
#         s3_manager.add_variable(pipeline_uuid, block_uuid, variable_uuid, test_data)

#         # Assertion on S3 write method call
#         mock_s3_client.return_value.write_data.assert_called_once()

#         # Mock data retrieval
#         mock_s3_client.return_value.read_data.return_value = test_data
#         result = s3_manager.get_variable(
#             pipeline_uuid, block_uuid, variable_uuid, variable_type="dataframe"
#         )

#         pd.testing.assert_frame_equal(result, test_data)

#     @patch("mage_ai.data_preparation.variable_manager.S3Client")
#     def test_cleanup_variables_s3(self, mock_s3_client):
#         pipeline_uuid = "pipeline_s3_cleanup"
#         s3_manager = VariableManager(
#             storage_backend="s3", s3_bucket_name="test_cleanup_bucket"
#         )
#         s3_manager.clean_variables(pipeline_uuid)

#         # Check if the cleanup method in the S3Client was called
#         mock_s3_client.return_value.remove_dir.assert_called_with(f"{pipeline_uuid}/")

#     @patch("mage_ai.data_preparation.variable_manager.LocalStorage")
#     def test_add_variable_async(self, mock_storage):
#         pipeline_uuid = "async_pipeline"
#         block_uuid = "async_block"
#         variable_uuid = "async_variable_df"
#         test_data = pd.DataFrame({"col1": [4, 5, 6], "col2": ["u", "v", "w"]})

#         async def run_test():
#             await self.manager.add_variable_async(
#                 pipeline_uuid, block_uuid, variable_uuid, test_data
#             )
#             self.mock_storage.write_data.assert_called_once()

#         asyncio.run(run_test())


# class VariableManagerProjectPlatformTests(ProjectPlatformMixin):
#     def test_get_global_variable(self):
#         with patch(
#             "mage_ai.data_preparation.variable_manager.project_platform_activated",
#             lambda: True,
#         ):
#             with patch(
#                 "mage_ai.data_preparation.models.pipeline.project_platform_activated",
#                 lambda: True,
#             ):
#                 for settings in self.repo_paths.values():
#                     pipeline = Pipeline.create(
#                         self.faker.unique.name(),
#                         repo_path=settings["full_path"],
#                     )
#                     value = self.faker.unique.name()
#                     pipeline.variables = dict(mage=value)
#                     pipeline.save()

#                     self.assertEqual(get_global_variable(pipeline.uuid, "mage"), value)

#     def test_get_global_variables(self):
#         with patch(
#             "mage_ai.data_preparation.variable_manager.project_platform_activated",
#             lambda: True,
#         ):
#             with patch(
#                 "mage_ai.data_preparation.models.pipeline.project_platform_activated",
#                 lambda: True,
#             ):
#                 for settings in self.repo_paths.values():
#                     pipeline = Pipeline.create(
#                         self.faker.unique.name(),
#                         repo_path=settings["full_path"],
#                     )
#                     pipeline.variables = self.faker.unique.name()
#                     pipeline.save()

#                     self.assertEqual(
#                         get_global_variables(None, pipeline=pipeline),
#                         pipeline.variables,
#                     )
#                     self.assertEqual(
#                         get_global_variables(pipeline.uuid), pipeline.variables
#                     )
