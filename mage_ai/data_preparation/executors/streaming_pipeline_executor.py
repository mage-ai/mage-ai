from contextlib import redirect_stdout
from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from typing import Callable, Dict
import sys
import yaml


class StreamingPipelineExecutor(PipelineExecutor):
    def __init__(self, pipeline: Pipeline):
        super().__init__(pipeline)
        self.parse_and_validate_blocks()

    def parse_and_validate_blocks(self):
        """
        Validate whether the block
        """
        blocks = self.pipeline.blocks_by_uuid.values()
        source_blocks = []
        sink_blocks = []
        for b in blocks:
            if b.type == BlockType.DATA_LOADER:
                if len(b.upstream_blocks or []) > 0:
                    raise Exception('Data loader can\'t have upstream blocks.')
                source_blocks.append(b)
            if b.type == BlockType.DATA_EXPORTER:
                if len(b.downstream_blocks or []) > 0:
                    raise Exception('Data expoter can\'t have downstream blocks.')
                sink_blocks.append(b)
        if len(source_blocks) == 0:
            raise Exception('Please provide a data loader block as the source.')
        if len(sink_blocks) == 0:
            raise Exception('Please provide a data expoter block as the sink.')
        self.source_block = source_blocks[0]
        self.sink_block = sink_blocks[0]

    def execute(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        global_vars: Dict = None,
    ) -> None:
        # TODOs:
        # 1. Support multiple sources and sinks
        # 2. Support flink pipeline
        if build_block_output_stdout:
            stdout = build_block_output_stdout(self.pipeline.uuid)
        else:
            stdout = sys.stdout
        with redirect_stdout(stdout):
            self.__execute_in_python()

    def __execute_in_python(self):
        from mage_ai.streaming.sources.source_factory import SourceFactory
        from mage_ai.streaming.sinks.sink_factory import SinkFactory
        source_config = yaml.safe_load(self.source_block.content)
        sink_config = yaml.safe_load(self.sink_block.content)
        source = SourceFactory.get_source(source_config)
        sink = SinkFactory.get_sink(sink_config)
        for message in source.read():
            # TODO: Support transformation
            sink.write(message)

    def __excute_in_flink(self):
        pass
