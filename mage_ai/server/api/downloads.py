from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.server.api.base import BaseHandler

import tornado.gen


class ApiDownloadHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self, pipeline_uuid, block_uuid):
        self.set_header('Content-Type', 'text/csv')
        self.set_header('Content-Disposition', 'attachment; filename=' + f'{block_uuid}.csv')
        self.set_header('Content-Encoding', 'UTF-8')

        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')

        tables = block.get_outputs(
            include_print_outputs=False,
            csv_lines_only=True,
            sample=False,
            variable_type=VariableType.DATAFRAME,
        )
        for table in tables:
            line_count = len(table)
            for line in range(0, line_count):
                self.write(table[line].encode('UTF-8'))
                if (line > 0 and (line % 10000 == 0 or line == line_count - 1)):
                    yield self.flush()
