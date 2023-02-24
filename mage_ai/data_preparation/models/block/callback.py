from contextlib import redirect_stdout
from logging import Logger
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import (
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.shared.stream import StreamToLogger
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import (
    clean_name as clean_name_orig,
)
from typing import Dict
import sys


def callback_block_name(block_name):
    return f'{clean_name_orig(block_name)}_callback'


class CallbackBlock(Block):
    @classmethod
    def create(cls, orig_block_name):
        return super().create(
            callback_block_name(orig_block_name),
            BlockType.CALLBACK,
            get_repo_path(),
            language=BlockLanguage.PYTHON,
        )

    def execute_callback(
        self,
        callback: str,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        **kwargs
    ):
        pipeline_run = kwargs.get('pipeline_run')
        try:
            if logger is not None:
                stdout = StreamToLogger(logger, logging_tags=logging_tags)
            else:
                stdout = sys.stdout
            with redirect_stdout(stdout):
                global_vars = merge_dict(
                    global_vars or dict(),
                    dict(
                        pipeline_uuid=self.pipeline.uuid,
                        block_uuid=self.uuid,
                        pipeline_run=pipeline_run,
                    ),
                )
                fs = dict(on_success=[], on_failure=[])
                globals = {
                    k: self._block_decorator(v) for k, v in fs.items()
                }
                exec(self.content, globals)

                callback_functions = fs[callback]

                if callback_functions:
                    callback = callback_functions[0]
                    callback(**global_vars)
        except Exception:
            pass

    def update_content(self, content, widget=False):
        if not self.file.exists():
            raise Exception(f'File for block {self.uuid} does not exist at {self.file.file_path}.')

        if content != self.content:
            self._content = content
            self.file.update_content(content)
        return self

    async def update_content_async(self, content, widget=False):
        block_content = await self.content_async()
        if content != block_content:
            self._content = content
            await self.file.update_content_async(content)
        return self