from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType, DATAFRAME_SAMPLE_COUNT_PREVIEW
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path, init_repo, set_repo_path
from mage_ai.data_preparation.utils.block.convert_content import convert_to_block
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.server.active_kernel import (
    interrupt_kernel,
    restart_kernel,
    start_kernel,
    switch_active_kernel,
)
from mage_ai.server.api.autocomplete_items import ApiAutocompleteItemsHandler
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.widgets import ApiPipelineWidgetDetailHandler, ApiPipelineWidgetListHandler
from mage_ai.server.constants import DATA_PREP_SERVER_PORT
from mage_ai.server.kernel_output_parser import parse_output_message
from mage_ai.server.kernels import (
    DEFAULT_KERNEL_NAME,
    kernel_managers,
    KernelName,
    PIPELINE_TO_KERNEL_NAME,
)
from mage_ai.server.subscriber import get_messages
from mage_ai.server.websocket import WebSocketServer
import argparse
import asyncio
import json
import os
import socket
import tornado.ioloop
import tornado.web
import urllib.parse


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

        self.write(dict(file_content=file.to_dict(include_content=True)))

    def put(self, file_path_encoded):
        file_path = urllib.parse.unquote(file_path_encoded)
        file = File.from_path(file_path, get_repo_path())

        data = json.loads(self.request.body).get('file_content', {})
        content = data.get('content')
        if content is None:
            raise Exception('Please provide a \'content\' param in the request payload.')
        file.update_content(content)

        self.write(dict(file_content=file.to_dict(include_content=True)))


class ApiPipelineHandler(BaseHandler):
    def delete(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        response = dict(pipeline=pipeline.to_dict())
        pipeline.delete()
        self.write(response)

    def get(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        include_content = self.get_bool_argument('include_content', True)
        include_outputs = self.get_bool_argument('include_outputs', True)
        switch_active_kernel(PIPELINE_TO_KERNEL_NAME[pipeline.type])
        self.write(
            dict(
                pipeline=pipeline.to_dict(
                    include_content=include_content,
                    include_outputs=include_outputs,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )
            )
        )
        self.finish()

    def put(self, pipeline_uuid):
        """
        Allow updating pipeline name and uuid
        """
        pipeline = Pipeline.get(pipeline_uuid)
        update_content = self.get_bool_argument('update_content', False)
        data = json.loads(self.request.body).get('pipeline', {})
        pipeline.update(data, update_content=update_content)
        switch_active_kernel(PIPELINE_TO_KERNEL_NAME[pipeline.type])
        self.write(
            dict(
                pipeline=pipeline.to_dict(
                    include_content=update_content,
                    include_outputs=update_content,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )
            )
        )


class ApiPipelineExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)

        global_vars = None
        if len(self.request.body) != 0:
            global_vars = json.loads(self.request.body).get('global_vars')

        asyncio.run(pipeline.execute(global_vars=global_vars))
        self.write(
            dict(
                pipeline=pipeline.to_dict(
                    include_outputs=True,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )
            )
        )
        self.finish()


class ApiPipelineListHandler(BaseHandler):
    def get(self):
        pipelines = Pipeline.get_all_pipelines(get_repo_path())
        self.write(dict(pipelines=pipelines))
        self.finish()

    def post(self):
        pipeline = json.loads(self.request.body).get('pipeline', {})
        clone_pipeline_uuid = pipeline.get('clone_pipeline_uuid')
        name = pipeline.get('name')
        if clone_pipeline_uuid is None:
            pipeline = Pipeline.create(name, get_repo_path())
        else:
            source = Pipeline.get(clone_pipeline_uuid)
            pipeline = Pipeline.duplicate(source, name)
        self.write(dict(pipeline=pipeline.to_dict()))


class ApiPipelineBlockHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        include_outputs = self.get_bool_argument('include_outputs', True)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        self.write(
            dict(
                block=block.to_dict(
                    include_content=True,
                    include_outputs=include_outputs,
                )
            )
        )
        self.finish()

    def put(self, pipeline_uuid, block_uuid):
        """
        Allow updating block name, uuid, type, upstream_block, and downstream_blocks
        """
        pipeline = Pipeline.get(pipeline_uuid)
        data = json.loads(self.request.body).get('block', {})
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.update(data)
        self.write(dict(block=block.to_dict(include_content=True)))

    def delete(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        block.delete()
        self.write(dict(block=block.to_dict()))


class ApiPipelineBlockExecuteHandler(BaseHandler):
    def post(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        asyncio.run(block.execute(redirect_outputs=True))
        self.write(
            dict(
                block=block.to_dict(
                    include_outputs=True,
                )
            )
        )
        self.finish()


class ApiPipelineBlockListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        include_outputs = self.get_bool_argument('include_outputs', True)
        self.write(
            dict(
                blocks=pipeline.to_dict(
                    include_content=True,
                    include_outputs=include_outputs,
                    sample_count=DATAFRAME_SAMPLE_COUNT_PREVIEW,
                )['blocks']
            )
        )
        self.finish()

    def post(self, pipeline_uuid):
        """
        Create block and add to pipeline
        """
        pipeline = Pipeline.get(pipeline_uuid)
        payload = json.loads(self.request.body).get('block', {})
        block = Block.create(
            payload.get('name') or payload.get('uuid'),
            payload.get('type'),
            get_repo_path(),
            config=payload.get('config'),
            pipeline=pipeline,
            priority=payload.get('priority'),
            upstream_block_uuids=payload.get('upstream_blocks', []),
        )

        content = payload.get('content')
        if content:
            if payload.get('converted_from'):
                content = convert_to_block(block, content)

            block.update_content(content)

        pipeline.add_block(block, payload.get('upstream_blocks', []))
        self.write(dict(block=block.to_dict(include_content=True)))


class ApiPipelineBlockAnalysisHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        analyses = block.get_analyses()
        self.write(dict(analyses=analyses))


class ApiPipelineBlockOutputHandler(BaseHandler):
    def get(self, pipeline_uuid, block_uuid):
        pipeline = Pipeline.get(pipeline_uuid)
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception(f'Block {block_uuid} does not exist in pipeline {pipeline_uuid}')
        outputs = block.get_outputs(sample_count=None)
        self.write(dict(outputs=outputs))


class ApiPipelineVariableListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        variables_dict = VariableManager(get_repo_path()).get_variables_by_pipeline(pipeline_uuid)
        variables = [
            dict(
                block=dict(uuid=uuid),
                pipeline=dict(uuid=pipeline_uuid),
                variables=arr,
            )
            for uuid, arr in variables_dict.items()
        ]
        self.write(dict(variables=variables))
        self.finish()


class KernelsHandler(BaseHandler):
    def get(self, kernel_id=None):
        kernels = []

        for kernel_name in KernelName:
            kernel = kernel_managers[kernel_name]
            if kernel.has_kernel:
                kernels.append(
                    dict(
                        alive=kernel.is_alive(),
                        id=kernel.kernel_id,
                        name=kernel.kernel_name,
                    )
                )

        r = json.dumps(dict(kernels=kernels))
        self.write(r)

    def post(self, kernel_id, action_type):
        kernel_name = self.get_argument('kernel_name', DEFAULT_KERNEL_NAME)
        if kernel_name not in kernel_managers:
            kernel_name = DEFAULT_KERNEL_NAME
        switch_active_kernel(kernel_name)
        if 'interrupt' == action_type:
            interrupt_kernel()
        elif 'restart' == action_type:
            try:
                restart_kernel()
            except RuntimeError as e:
                # RuntimeError: Cannot restart the kernel. No previous call to 'start_kernel'.
                if 'start_kernel' in str(e):
                    start_kernel()

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
    routes = [
        (r'/', MainHandler),
        # (r'/pipelines', MainHandler),
        (r'/pipelines/(.*)', MainHandler),
        (
            r'/_next/static/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist/_next/static')},
        ),
        (
            r'/fonts/(.*)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist/fonts')},
        ),
        (
            r'/(favicon.ico)',
            tornado.web.StaticFileHandler,
            {'path': os.path.join(os.path.dirname(__file__), 'frontend_dist')},
        ),
        (r'/websocket/', WebSocketServer),
        (r'/api/blocks/(?P<block_type_and_uuid_encoded>.+)', ApiBlockHandler),
        (r'/api/files', ApiFileListHandler),
        (r'/api/file_contents/(?P<file_path_encoded>.+)', ApiFileContentHandler),
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
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/widgets/(?P<block_uuid>\w+)',
            ApiPipelineWidgetDetailHandler,
        ),
        (
            r'/api/pipelines/(?P<pipeline_uuid>\w+)/widgets',
            ApiPipelineWidgetListHandler,
        ),
        (r'/api/kernels', KernelsHandler),
        (r'/api/kernels/(?P<kernel_id>[\w\-]*)/(?P<action_type>[\w\-]*)', KernelsHandler),
        (r'/api/autocomplete_items', ApiAutocompleteItemsHandler),
    ]
    return tornado.web.Application(
        routes,
        autoreload=True,
        template_path=os.path.join(os.path.dirname(__file__), 'frontend_dist'),
    )


async def main(
    host: str = None,
    port: str = None,
    project: str = None,
):
    host = host if host else None
    port = port if port else DATA_PREP_SERVER_PORT
    project = project if project else None

    if project:
        project = project = os.path.abspath(project)
    else:
        project = os.path.join(os.getcwd(), 'default_repo')

    if not os.path.exists(project):
        init_repo(project)
    set_repo_path(project)

    switch_active_kernel(DEFAULT_KERNEL_NAME)

    app = make_app()

    def is_port_in_use(port: int) -> bool:
        print(f'Checking port {port}...')
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0

    port = int(port)
    max_port = port + 100
    while is_port_in_use(port):
        if port > max_port:
            raise Exception(
                'Unable to find an open port, please clear your running processes if possible.'
            )
        port += 1

    app.listen(
        port,
        address=host,
    )

    print(f'Mage is running at http://{host or "localhost"}:{port} and serving project {project}')

    get_messages(
        lambda content: WebSocketServer.send_message(
            parse_output_message(content),
        ),
    )

    await asyncio.Event().wait()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', type=str, default=None)
    parser.add_argument('--port', type=str, default=None)
    parser.add_argument('--project', type=str, default=None)
    args = parser.parse_args()

    host = args.host
    port = args.port
    project = args.project

    asyncio.run(
        main(
            host=host,
            port=port,
            project=project,
        )
    )
