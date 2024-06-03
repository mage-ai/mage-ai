import threading

from pygls.server import LanguageServer

server = None


class MyLanguageServer(LanguageServer):
    def __init__(self, *args):
        super().__init__(*args)
        self.feature_capabilities = {}

    def register_capability(self, name, func):
        self.feature_capabilities[name] = func


def get_server() -> MyLanguageServer:
    global server

    if server is not None:
        return server

    def start_server():
        server.start_io()

    server = MyLanguageServer('my-language-server', 'v0.1')
    threading.Thread(target=start_server, daemon=True).start()

    print('LSP routes /lsp and /lsp/(.*) added')

    @server.feature('initialize')
    async def initialize(ls, params):
        return {'capabilities': ls.feature_capabilities}

    @server.feature('shutdown')
    async def shutdown(ls, *args):
        pass

    @server.feature('exit')
    async def exit(ls, *args):
        server.stop()

    # Example feature
    @server.feature('textDocument/completion')
    async def completion(ls, params):
        return {
            'items': [
                {
                    'label': 'Hello, World!',
                    'kind': 1,  # Text
                    'detail': 'Example completion detail',
                }
            ]
        }

    return server
