// https://microsoft.github.io/monaco-editor/typedoc/enums/languages.CompletionItemKind.html
// Class
// Color
// Constant
// Constructor
// Customcolor
// Enum
// Event
// Field
// File
// Folder
// Function
// Interface
// Issue
// Keyword
// Method
// Module
// Operator
// Property
// Reference
// Snippet
// Struct
// Text
// Type
// Unit
// User
// Value
// Variable
export default function autocomplete(monaco) {
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: function (model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        {
          label: 'print',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Prints a message to the console.',
          insertText: 'print(${1:object})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        },
        {
          label: 'len',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Returns the length of an object.',
          insertText: 'len(${1:object})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        },
        // Adding new suggestions
        {
          label: 'type',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Returns the type of an object.',
          insertText: 'type(${1:object})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        },
        {
          label: 'isinstance',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Checks if an object is an instance of a class or of a subclass thereof.',
          insertText: 'isinstance(${1:object}, ${2:classinfo})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        },
        {
          label: 'issubclass',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Checks if a class is a subclass of another class.',
          insertText: 'issubclass(${1:class}, ${2:classinfo})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
        },
      ];

      return { suggestions: suggestions };
    },
    triggerCharacters: ['.', '('],
  });
}
