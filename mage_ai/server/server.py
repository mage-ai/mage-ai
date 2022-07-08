from jupyter_client import KernelManager
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path, init_repo, set_repo_path
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.server.kernel_output_parser import parse_output_message
from mage_ai.server.subscriber import get_messages
from mage_ai.server.websocket import WebSocketServer
import asyncio
import json
import os
import simplejson
import tornado.ioloop
import tornado.web
import traceback
import urllib.parse


manager = KernelManager()


class BaseHandler(tornado.web.RequestHandler):
    def check_origin(self, origin):
        return True

    def get_bool_argument(self, name, default_value=None):
        value = self.get_argument(name, default_value)
        if type(value) is not str:
            return value
        return value.lower() in ('yes', 'true', 't', '1')

    def options(self, **kwargs):
        self.set_status(204)
        self.finish()

    def set_default_headers(self):
        self.set_header('Access-Control-Allow-Headers', '*')
        self.set_header('Access-Control-Allow-Methods', 'DELETE, GET, PATCH, POST, PUT, OPTIONS')
        self.set_header('Access-Control-Allow-Origin', '*')
        self.set_header('Content-Type', 'application/json')

    def write(self, chunk):
        if type(chunk) is dict:
            chunk = simplejson.dumps(chunk, ignore_nan=True)
        super().write(chunk)

    def write_error(self, status_code, **kwargs):
        if status_code == 500:
            exception = kwargs['exc_info'][1]
            self.write(
                dict(
                    error=dict(
                        code=status_code,
                        errors=traceback.format_stack(),
                        exception=str(exception),
                        message=traceback.format_exc(),
                    ),
                    url_parameters=self.path_kwargs,
                )
            )


class MainHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('index.html')


class ApiBlockHandler(BaseHandler):
    def delete(self, block_type_and_uuid_encoded):
        block_type_and_uuid = urllib.parse.unquote(block_type_and_uuid_encoded)
        parts = block_type_and_uuid.split('/')
        if len(parts) != 2:
            raise Exception('The url path should be in block_type/block_uuid format.')
        block_type = parts[0]
        block_uuid = parts[1]
        block = Block(block_uuid, block_uuid, block_type)
        if not block.exists():
            raise Exception(f'Block {block_uuid} does not exist')
        block.delete()
        self.write(dict(block=block.to_dict()))


class ApiFileListHandler(BaseHandler):
    def get(self):
        self.write(dict(files=[File.get_all_files(get_repo_path())]))

    def post(self):
        data = json.loads(self.request.body).get('file', {})
        file = File.create(data.get('name'), data.get('dir_path'), get_repo_path())
        self.write(dict(file=file.to_dict()))


class ApiFileContentHandler(BaseHandler):
    def get(self, file_path_encoded):
        file_path = urllib.parse.unquote(file_path_encoded)
        file = File.from_path(file_path, get_repo_path())

        self.write(dict(file=file.to_dict(include_content=True)))

    def put(self, file_path_encoded):
        file_path = urllib.parse.unquote(file_path_encoded)
        file = File.from_path(file_path, get_repo_path())

        data = json.loads(self.request.body).get('file', {})
        content = data.get('content')
        file.update_content(content)

        self.write(dict(file=file.to_dict(include_content=True)))


class ApiPipelineHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        include_content = self.get_bool_argument('include_content', True)
        include_outputs = self.get_bool_argument('include_outputs', True)
        self.write(dict(pipeline=pipeline.to_dict(
            include_content=include_content,
            include_outputs=include_outputs,
            sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
        )))
        self.finish()

    def put(self, pipeline_uuid):
        """
        Allow updating pipeline name and uuid
        """
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        update_content = self.get_bool_argument('update_content', False)
        data = json.loads(self.request.body).get('pipeline', {})
        pipeline.update(data, update_content=update_content)
        self.write(dict(pipeline=pipeline.to_dict(
            include_content=update_content,
            include_outputs=update_content,
            sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
        )))


class ApiPipelineExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        asyncio.run(pipeline.execute())
        self.write(dict(pipeline=pipeline.to_dict(
            include_outputs=True,
            sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
        )))
        self.finish()


class ApiPipelineListHandler(BaseHandler):
    def get(self):
        pipelines = Pipeline.get_all_pipelines(get_repo_path())
        self.write(dict(pipelines=pipelines))
        self.finish()

    def post(self):
        data = json.loads(self.request.body)
        name = data.get('pipeline', {}).get('name')
        pipeline = Pipeline.create(name, get_repo_path())
        self.write(dict(pipeline=pipeline.to_dict()))


class ApiPipelineBlockHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        include_outputs = self.get_bool_argument('include_outputs', True)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        self.write(dict(block=block.to_dict(
            include_content=True,
            include_outputs=include_outputs,
        )))
        self.finish()

    def put(self, pipeline_uuid, block_uuid):
        """
        Allow updating block name, uuid, upstream_block, and downstream_blocks
        """
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        data = json.loads(self.request.body).get('block', {})
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.update(data)
        self.write(dict(block=block.to_dict(include_content=True)))

    def delete(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.delete()
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        asyncio.run(block.execute())
        self.write(dict(block=block.to_dict(
            include_outputs=True,
        )))
        self.finish()


class ApiPipelineBlockListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        include_outputs = self.get_bool_argument('include_outputs', True)
        self.write(dict(blocks=pipeline.to_dict(
            include_content=True,
            include_outputs=include_outputs,
            sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
        )['blocks']))
        self.finish()

    def post(self, pipeline_uuid):
        """
        Create block and add to pipeline
        """
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block_data = json.loads(self.request.body).get('block', {})
        block = Block.create(
            block_data.get('name') or block_data.get('uuid'),
            block_data.get('type'),
            get_repo_path(),
            config=block_data.get('config'),
            pipeline=pipeline,
            priority=block_data.get('priority'),
            upstream_block_uuids=block_data.get('upstream_blocks', []),
        )
        pipeline.add_block(block, block_data.get('upstream_blocks', []))
        self.write(dict(block=block.to_dict(include_content=True)))


class ApiPipelineBlockAnalysisHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        analyses = block.get_analyses()
        self.write(dict(analyses=analyses))


class ApiPipelineBlockOutputHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline(pipeline_uuid, get_repo_path())
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        outputs = block.get_outputs()
        self.write(dict(outputs=outputs))


class ApiPipelineVariableListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        variables_dict = VariableManager(get_repo_path()).get_variables_by_pipeline(pipeline_uuid)
        variables = [dict(
            block=dict(uuid=uuid),
            pipeline=dict(uuid=pipeline_uuid),
            variables=arr,
        ) for uuid, arr in variables_dict.items()]
        self.write(dict(variables=variables))
        self.finish()


class KernelsHandler(BaseHandler):
    def get(self, kernel_id=None):
        kernels = []

        if manager.has_kernel:
            kernels.append(
                dict(
                    alive=manager.is_alive(),
                    id=manager.kernel_id,
                    name=manager.kernel_name,
                )
            )

        r = json.dumps(dict(kernels=kernels))
        self.write(r)

    def post(self, kernel_id, action_type):
        if 'interrupt' == action_type:
            manager.interrupt_kernel()
        elif 'restart' == action_type:
            try:
                manager.restart_kernel()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    manager.start_kernel()
            os.environ['CONNECTION_FILE'] = manager.connection_file

        r = json.dumps(
            dict(
                kernel=dict(
                    id=kernel_id,
                ),
            )
        )
        self.write(r)
        self.finish()


def make_app():
    return tornado.web.Application(
        [
            (r'/', MainHandler),
            # (r'/pipelines', MainHandler),
            (r'/pipelines/(.*)', MainHandler),
            (
                r'/_next/static/(.*)',
                tornado.web.StaticFileHandler,
                {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist/_next/static') },
            ),
            (r'/websocket/', WebSocketServer),
            (r'/api/blocks/(?P<block_type_and_uuid_encoded>.+)', ApiBlockHandler),
            (r'/api/files', ApiFileListHandler),
            (r'/api/file_contents(?P<file_path_encoded>.+)', ApiFileContentHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/execute', ApiPipelineExecuteHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)', ApiPipelineHandler),
            (r'/api/pipelines', ApiPipelineListHandler),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/execute',
                ApiPipelineBlockExecuteHandler,
            ),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)',
                ApiPipelineBlockHandler,
            ),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/analyses',
                ApiPipelineBlockAnalysisHandler,
            ),
            (
                r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks/(?P<block_uuid>\w+)/outputs',
                ApiPipelineBlockOutputHandler,
            ),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/blocks', ApiPipelineBlockListHandler),
            (r'/api/pipelines/(?P<pipeline_uuid>\w+)/variables', ApiPipelineVariableListHandler),
            (r'/api/kernels', KernelsHandler),
            (r'/api/kernels/(?P<kernel_id>[\w\-]*)/(?P<action_type>[\w\-]*)', KernelsHandler),
        ],
        autoreload=True,
        template_path=os.path.join(os.path.dirname(__file__), 'frontend_dist'),
    )


async def main(repo_path: str = None):
    if repo_path is None:
        repo_path = os.path.join(os.getcwd(), 'default_repo')
    if not os.path.exists(repo_path):
        init_repo(repo_path)
    set_repo_path(repo_path)

    manager.start_kernel()
    os.environ['CONNECTION_FILE'] = manager.connection_file

    app = make_app()
    app.listen(6789)

    get_messages(
        manager.client(),
        lambda content: WebSocketServer.send_message(
            parse_output_message(content),
        ),
    )

    await asyncio.Event().wait()


if __name__ == '__main__':
    print('Starting server...')

    asyncio.run(main())
