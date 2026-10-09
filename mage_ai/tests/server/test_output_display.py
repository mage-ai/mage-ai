from unittest import TestCase

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.server.kernels import KernelName
from mage_ai.server.utils.output_display import (
    add_execution_code,
    get_block_output_process_code,
    get_pipeline_execution_code,
)


class OutputDisplayTests(TestCase):
    WINDOWS_REPO_PATH = r'C:\Users\mage\project'
    WINDOWS_REPO_PATH_LITERAL = r"'C:\\Users\\mage\\project'"

    def test_add_execution_code_escapes_windows_repo_path(self):
        generated_code = add_execution_code(
            pipeline_uuid='test_pipeline',
            block_uuid='test_block',
            code='1 + 1',
            global_vars={},
            repo_path=self.WINDOWS_REPO_PATH,
            pipeline_config_json_encoded='e30=',
            repo_config_json_encoded='e30=',
        )

        self.assertIn(f'repo_path={self.WINDOWS_REPO_PATH_LITERAL}', generated_code)
        compile(generated_code, '<output_display>', 'exec')

    def test_execution_output_helpers_escape_windows_repo_path(self):
        block_output_code = get_block_output_process_code(
            pipeline_uuid='test_pipeline',
            block_uuid='test_block',
            repo_path=self.WINDOWS_REPO_PATH,
            block_type=BlockType.DATA_LOADER,
            kernel_name=KernelName.PYSPARK,
        )
        pipeline_execution_code = get_pipeline_execution_code(
            pipeline_uuid='test_pipeline',
            repo_path=self.WINDOWS_REPO_PATH,
            pipeline_config=dict(type='python'),
        )

        self.assertIn(f'repo_path={self.WINDOWS_REPO_PATH_LITERAL}', block_output_code)
        self.assertIn(f'repo_path={self.WINDOWS_REPO_PATH_LITERAL}', pipeline_execution_code)
        compile(pipeline_execution_code, '<output_display>', 'exec')
