import { Ref } from 'react';
import { LanguageEnum } from '../languages/constants';

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
let deltaDecorarationsAdded = false;
let decorationIds = []; // Store existing decoration IDs

export default function autocomplete(monaco: any, language: LanguageEnum = LanguageEnum.PYTHON) {
  monaco.languages.registerCompletionItemProvider(language, {
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

      return { suggestions: suggestions, preselect: true };
    },
    triggerCharacters: ['.', '('],
  });

  // Add custom behavior for suggest widget decorations
  const applyCustomDecorations = editor => {
    const model = editor.getModel();
    const position = editor.getPosition();

    if (model && position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );

      const decorations = [
        {
          range,
          options: {
            // Ensure inline decoration for word highlight.
            inlineClassName: 'myCustomLineDecoration',
          },
        },
        {
          // Highlight the entire line for better visibility.
          range: new monaco.Range(
            position.lineNumber,
            1, // Start from the first column
            position.lineNumber,
            model.getLineMaxColumn(position.lineNumber), // End at the last column of the line
          ),
          options: {
            className: 'myCustomLineDecoration',
            glyphMarginClassName: 'debugGlyphMargin',
          },
        },
      ];

      if (!deltaDecorarationsAdded) {
        // Applying decorations with a flag
        try {
          // Replace existing decorations with new ones
          decorationIds = editor.deltaDecorations(decorationIds, decorations);
          deltaDecorarationsAdded = true;
        } finally {
          deltaDecorarationsAdded = false;
        }
      }
    }
  };

  // // Ensure correct event listeners for updates
  // if (monaco.editor) {
  //   monaco.editor.onDidChangeModelContent(() => {
  //     applyCustomDecorations(monaco.editor);
  //   });
  //   monaco.editor.onDidChangeCursorPosition(() => {
  //     applyCustomDecorations(monaco.editor);
  //   });
  //   monaco.editor.onDidChangeCursorSelection(() => {
  //     applyCustomDecorations(monaco.editor);
  //   });
  // } else {
  //   console.error('Monaco editor instance not found');
  // }
}
