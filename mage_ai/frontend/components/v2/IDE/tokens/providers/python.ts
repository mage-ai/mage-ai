// From Python to TypeScript
const mapping = {
  attribute: 'property',
  boolean: 'constant',
};

const provider = {
  tokenizer: {
    root: [
      // Prioritize import statements to avoid conflicts
      [/(from)(\s+)([\w\.]+)(\s+)(import)(\s*\(?)/, ['keyword', 'white', 'namespace', 'white', 'keyword', 'brackets.round'], '@multiLineImport'],
      [/(import)(\s+)([\w\.,\s]+)/, ['keyword', 'white', 'type']],


      [/[\[\]]/, 'brackets.square'], // Brackets
      [/[()]/, 'brackets.round'], // Parentheses
      [/[{}]/, 'brackets.curly'], // Braces


      // Attributes with type hints
      [/(\.)(\w+)([:])/, ['punctuation.delimiter', 'attribute', 'punctuation.delimiter']], // Attributes with type hints
      [/(\.)(\w+)/, ['punctuation.delimiter', 'attribute']], // Attributes with type hints
      [/[:,;]/, 'punctuation.delimiter'], // Colons, semicolons, commas, and other delimiters

      // Booleans
      [/\b(True|False)\b/, 'literal.boolean'],

      // // Keywords
      // [/\b(class|if|else|elif|while|for|return|import|from|as|pass|break|continue|try|except|finally|with|lambda|yield|assert|async|await|nonlocal|global|del|raise)\b/, 'keyword'],

      // Uppercase constants at class level
      [/\b[A-Z_][A-Z_0-9]*\b(?=\s*=)/, 'enum'],

      // Constants in uppercase
      [/\b(None)\b/, 'literal.none'],
      [/\b([A-Z_][A-Z_0-9]*)\b/, 'constant'],

      // Class declarations
      // [/(class)\s+(\w+)(\s*)?(\(\s*\w+\s*(,\s*\w+\s*)*\))?/, ['keyword', 'type.identifier', 'white', 'type']], // Class declarations


      // // Function and Constructor definitions
      [/(\bdef\b)(\s+)(__\w+__)/, ['keyword', 'white', 'constructor']],  // Keyword def and special method (constructor)
      [/(\bdef\b)(\s+)([a-zA-Z_]\w*)/, ['keyword', 'white', 'function.name']],  // Keyword def and regular function

      // Self and cls in methods
      [/\b(self|cls)\b/, 'variable.self'],

      // Numeric literals
      [/\d+(\.\d+)?([eE][\-+]?\d+)?/, 'literal.number'],

      // // Operators and delimiters
      [/[=+\-*/%&|^~<>!]+/, 'operator'],

      // Handle triple-quoted strings on a single line
      [/"""/, { token: 'string.quote.double.triple', bracket: '@open', next: '@multiLineDoubleString' }],
      [/'''/, { token: 'string.quote.single.triple', bracket: '@open', next: '@multiLineSingleString' }],

      // Handle invalid single-line strings only at the end of the line
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // Invalid double-quoted string if not closed at end of line
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // Invalid single-quoted string if not closed at end of the line

      // Start of regular double-quoted and single-quoted strings
      [/"/, { token: 'string.quote.double', bracket: '@open', next: '@doubleString' }],
      [/'/, { token: 'string.quote.single', bracket: '@open', next: '@singleString' }],

      // Comments
      [/#.*/, 'comment'],
    ],

    // Handle double-quoted string escape sequences correctly
    doubleString: [
      [/[^"\\]+/, 'string'], // Match the string content until a double quote or backslash
      [/\\./, 'string.escape'], // Handle escape sequences
      [/(?<!\\)"/, { token: 'string.quote.double', bracket: '@close', next: '@pop' }], // Match closing double quote
      [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
    ],

    // Handle single-quoted string escape sequences correctly
    singleString: [
      [/[^'\\]+/, 'string'], // Match the string content until a single quote or backslash
      [/\\./, 'string.escape'], // Handle escape sequences
      [/(?<!\\)'/, { token: 'string.quote.single', bracket: '@close', next: '@pop' }], // Match closing single quote
      [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
    ],

    // Triple double-quoted string state
    multiLineDoubleString: [
      [/[^\\"]+/, 'comment.doc'], // Match the string content until a triple quote or backslash
      [/\\./, 'string.escape'], // Handle escape sequences
      [/"""/, { token: 'string.quote.double.triple', bracket: '@close', next: '@pop' }], // Match closing triple double quote
      [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
    ],

    // Triple single-quoted string state
    multiLineSingleString: [
      [/[^\\']+/, 'comment.doc'], // Match the string content until a triple quote or backslash
      [/\\./, 'string.escape'], // Handle escape sequences
      [/'''/, { token: 'string.quote.single.triple', bracket: '@close', next: '@pop' }], // Match closing triple single quote
      [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
    ],

    // Handling multi-line import
    multiLineImport: [
      [/[^\s)\]]+/, 'type'], // Match module names and other parts of the import statement
      [/[,\]]/, 'delimiter'], // Match commas and closing brackets
      [/\)/, { token: 'delimiter.parenthesis', bracket: '@close', next: '@pop' }], // Match closing parenthesis and pop state
      [/\s+/, 'white'], // Match whitespace
      [/\*|\{[\w\.,\s]*\}/, 'type'], // Match wildcard or list of items
    ],
  },
};
export default provider;
