import logging
import re

from lsprotocol import types
from pygls.server import LanguageServer

ADDITION = re.compile(r'^\s*(\d+)\s*\+\s*(\d+)\s*=(?=\s*$)')


def add_features(server: LanguageServer) -> None:
    @server.feature(types.TEXT_DOCUMENT_CODE_LENS)
    def code_lens(params: types.CodeLensParams):
        """Return a list of code lens to insert into the given document.

        This method will read the whole document and identify each sum in the document and
        tell the language client to insert a code lens at each location.
        """
        items = []
        document_uri = params.text_document.uri
        document = server.workspace.get_text_document(document_uri)

        lines = document.lines
        for idx, line in enumerate(lines):
            match = ADDITION.match(line)
            if match is not None:
                range_ = types.Range(
                    start=types.Position(line=idx, character=0),
                    end=types.Position(line=idx, character=len(line) - 1),
                )

                left = int(match.group(1))
                right = int(match.group(2))

                code_lens = types.CodeLens(
                    range=range_,
                    data={
                        'left': left,
                        'right': right,
                        'uri': document_uri,
                    },
                )
                items.append(code_lens)

        return items

    @server.feature(types.CODE_LENS_RESOLVE)
    def code_lens_resolve(ls: LanguageServer, item: types.CodeLens):
        """Resolve the ``command`` field of the given code lens.

        Using the ``data`` that was attached to the code lens item created in the function
        above, this prepares an invocation of the ``evaluateSum`` command below.
        """
        logging.info('Resolving code lens: %s', item)

        left = item.data['left']
        right = item.data['right']
        uri = item.data['uri']

        args = dict(
            uri=uri,
            left=left,
            right=right,
            line=item.range.start.line,
        )

        item.command = types.Command(
            title=f'Evaluate {left} + {right}',
            command='codeLens.evaluateSum',
            arguments=[args],
        )
        return item

    @server.command('codeLens.evaluateSum')
    def evaluate_sum(ls: LanguageServer, args):
        logging.info('arguments: %s', args)

        arguments = args[0]
        document = ls.workspace.get_text_document(arguments['uri'])
        line = document.lines[arguments['line']]

        # Compute the edit that will update the document with the result.
        answer = arguments['left'] + arguments['right']
        edit = types.TextDocumentEdit(
            text_document=types.OptionalVersionedTextDocumentIdentifier(
                uri=arguments['uri'], version=document.version
            ),
            edits=[
                types.TextEdit(
                    new_text=f'{line.strip()} {answer}\n',
                    range=types.Range(
                        start=types.Position(line=arguments['line'], character=0),
                        end=types.Position(line=arguments['line'] + 1, character=0),
                    ),
                )
            ],
        )

        # Apply the edit.
        ls.apply_edit(types.WorkspaceEdit(document_changes=[edit]))


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(message)s')
    server = LanguageServer('code-lens-server', 'v1')
    add_features(server)
    server.start_io()
