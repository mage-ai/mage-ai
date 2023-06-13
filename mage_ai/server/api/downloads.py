from tornado import gen, iostream

from mage_ai.api.utils import authenticate_client_and_token
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.server.api.base import BaseHandler
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION


class ApiDownloadHandler(BaseHandler):
    async def get(self, pipeline_uuid, block_uuid, **kwargs):
        self.set_header('Content-Type', 'text/csv')
        self.set_header('Content-Disposition', 'attachment; filename=' + f'{block_uuid}.csv')

        api_key = self.get_argument('api_key', None, True)
        token = self.get_argument('token', None, True)
        if REQUIRE_USER_AUTHENTICATION:
            authenticated = False
            if api_key and token:
                oauth_client = Oauth2Application.query.filter(
                    Oauth2Application.client_id == api_key,
                ).first()
                if oauth_client:
                    oauth_token, valid = authenticate_client_and_token(oauth_client.id, token)
                    authenticated = valid and \
                        oauth_token and \
                        oauth_token.user
            if not authenticated:
                raise Exception('Unauthorized access to download block output.')

        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        pipeline_run_id = self.get_argument('pipeline_run_id', None)
        execution_partition = None
        if pipeline_run_id is not None:
            pipeline_run = PipelineRun.query.get(pipeline_run_id)
            execution_partition = pipeline_run.execution_partition

        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')

        tables = block.get_outputs(
            execution_partition=execution_partition,
            include_print_outputs=False,
            csv_lines_only=True,
            sample=False,
            variable_type=VariableType.DATAFRAME,
        )
        for data in tables:
            table = data.get('table', [])
            line_count = len(table)
            for line in range(0, line_count):
                is_last_line = line == line_count - 1
                try:
                    csv_line = table[line] if is_last_line else table[line] + '\n'
                    self.write(csv_line.encode('UTF-8'))
                except iostream.StreamClosedError:
                    break
                if line % 5000 == 0 or is_last_line:
                    await self.flush()
                    # Sleep for a nanosecond so other handlers can run and avoid blocking
                    await gen.sleep(0.000000001)
