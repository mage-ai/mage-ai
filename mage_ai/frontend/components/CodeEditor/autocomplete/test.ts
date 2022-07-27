import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';

export function createDependencyProposals(monaco, range) {
  // returning a static list of proposals, not even looking at the prefix (filtering is done by the Monaco editor),
  // here you could do a server side lookup
  return [
    {
      label: '"lodash"',
      // https://microsoft.github.io/monaco-editor/api/enums/monaco.languages.CompletionItemKind.html
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: 'The Lodash library exported as Node.js modules.',
      insertText: '"lodash": "*"',
      range,
    },
    {
      label: '"express"',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: 'Fast, unopinionated, minimalist web framework',
      insertText: '"express": "*"',
      range,
    },
    {
      label: '"mkdirp"',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: 'Recursively mkdir, like <code>mkdir -p</code>',
      insertText: '"mkdirp": "*"',
      range,
    },
    {
      label: '"my-third-party-library"',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: 'Describe your library here',
      insertText: '"${1:my-third-party-library}": "${2:1.2.3}"',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
  ];
}

export default function({
  block,
}: BlockType) {
  const {
    type,
  } = block;

  return (monaco) => {
    return (model, position) => {
      const suggestions = [];

      // find out if we are completing a property in the 'dependencies' object.
      var textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });
      var match = textUntilPosition.match(
        /"dependencies"\s*:\s*\{\s*("[^"]*"\s*:\s*"[^"]*"\s*,\s*)*([^"]*)?$/
      );
      // if (!match) {
      //   return { suggestions: [] };
      // }

      var word = model.getWordUntilPosition(position);
      var range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      if (BlockTypeEnum.SCRATCHPAD === type) {
        suggestions.push(...createDependencyProposals(monaco, range));
      }

      return {
        suggestions,
      };
    }
  };
}
