const mapping = {
  attribute: 'property',
  boolean: 'constant',
};

enum RegexEnum {
  constant = '(\\b[A-Z_0-9]+\\b)',
  type = '(\\b[A-Z_][A-Z_0-9a-z]+\\b)',
  'function.name' = '(\\b[_0-9a-z]+\\b)',
  'keyword.as' = '\\b(as)\\b',
  'keyword.from' = '\\b(from)\\b',
  'keyword.import' = '\\b(import)\\b',
  'punctuation.dot' = '(\\.)',
  'punctuation.delimiter' = '([:,;])',
  namespace = '(\\b[a-zA-Z_][a-zA-Z0-9_]*\\b)',
  white = '(\\s+)',
}

function buildRegexMatchers(keys: string[], opts?: { next?: string }): (RegExp | { token: string, next?: string }[])[] {
  const count = keys.length;

  return [
    new RegExp(keys.map(key => RegexEnum[key]).join('')),
    keys.map((key, idx) => ({
      token: key,
      ...(idx === count - 1 && opts?.next ? opts : {}),
    })),
  ];
}

const states = {
  importNamespaces: [
    buildRegexMatchers(['namespace', 'punctuation.dot'], { next: '@importNamespaces' }),
    buildRegexMatchers(['namespace', 'white', 'keyword.as', 'white', 'namespace'], { next: '@resetState' }),
    buildRegexMatchers(['namespace'], { next: '@resetState' }),
  ],

  importSymbols: [
    buildRegexMatchers(['namespace', 'white', 'keyword.as', 'white', 'namespace'], { next: '@resetState' }),
    buildRegexMatchers(['namespace'], { next: '@resetState' }),
  ],

  fromImport: [
    buildRegexMatchers(['namespace', 'punctuation.dot'], { next: '@importNamespaces' }),
    buildRegexMatchers(['namespace', 'white', 'keyword.import', 'white'], { next: '@importSymbols' }),
    buildRegexMatchers(['namespace'], { next: '@resetState' }),
  ],

  // Reset state after each import statement to handle subsequent imports independently
  resetState: [
    { include: 'root' },
  ],
};

const root = [
  buildRegexMatchers(['keyword.import', 'white'], { next: '@importNamespaces' }),
  buildRegexMatchers(['keyword.from', 'white'], { next: '@fromImport' }),
  buildRegexMatchers(['keyword.import', 'white', 'namespace'], { next: '@resetState' }), // reset state after each match
];

const provider = {
  tokenizer: {
    root,
    ...states,
  },
};

export default provider;


// import { range } from '@utils/array';

// // From Python to TypeScript
// const mapping = {
//   attribute: 'property',
//   boolean: 'constant',
// };

// enum RegexEnum {
//   constant = '(\\b([A-Z_0-9]+)\\b)',
//   type = '(\\b([A-Z_][A-Z_0-9a-z]+)\\b)',
//   'function.name' = '(\\b([_0-9a-z]+)\\b)',
//   'keyword.as' = '(as)',
//   'keyword.from' = '(from)',
//   'keyword.import' = '(import)',
//   'punctuation.dot' = '(\\.)',
//   'punctuation.delimiter' = '([:,;])',
//   namespace = '(\\b(?!import\\b)(?!from\\b)\\b(?!as\\b)\\w+\\b)',
//   white = '(\\s+)',
// }

// function buildRegexMatchers(keys: string[], opts?: {
//   next?: string;
// }): (RegExp | {
//   next?: string;
//   token: string;
// }[])[] {
//   const count = keys.length;

//   return [
//     new RegExp(keys.map(key => RegexEnum[key]).join('')),
//     keys.map((key, idx: number) => ({
//       next: idx === count - 1 ? opts?.next : undefined,
//       token: key,
//     })),
//   ];
// }

// const states = {

//   importNamespaces: [
//     buildRegexMatchers(['namespace', 'punctuation.dot'], { next: '@importNamespaces' }),
//     buildRegexMatchers(['namespace', 'white', 'keyword.as', 'white', 'namespace'], { next: '@pop' }),
//     buildRegexMatchers(['namespace'], { next: '@pop' }),
//   ],

//   namespacesNested: [
//     buildRegexMatchers(['namespace', 'punctuation.dot'], { next: '@namespacesNested' }),
//     buildRegexMatchers(['namespace'], { next: '@pop' }),
//   ],

//   fromImport: [
//     buildRegexMatchers(['namespace', 'punctuation.dot'], { next: '@namespacesNested' }),
//     buildRegexMatchers(['namespace', 'white', 'keyword.import', 'white'], { next: '@importSymbols' }),
//     buildRegexMatchers(['namespace'], { next: '@pop' }),
//   ],

//   importSymbols: [
//     buildRegexMatchers(['namespace', 'white', 'keyword.as', 'white', 'namespace'], { next: '@pop' }),
//     buildRegexMatchers(['namespace'], { next: '@pop' }),
//   ],

//   // importAs: [
//   //   buildRegexMatchers([
//   //     'keyword.as',
//   //     'white',
//   //     'namespace',
//   //   ], { next: '@pop' }),
//   //   // buildRegexMatchers([ 'namespace' ], { next: '@pop' }),
//   // ],

//   // // Handle double-quoted string escape sequences correctly
//   // doubleString: [
//   //   [/[^"\\]+/, 'string'], // Match the string content until a double quote or backslash
//   //   [/\\./, 'string.escape'], // Handle escape sequences
//   //   [/(?<!\\)"/, { token: 'string.quote.double', bracket: '@close', next: '@pop' }], // Match closing double quote
//   //   [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
//   // ],

//   // // Handle single-quoted string escape sequences correctly
//   // singleString: [
//   //   [/[^'\\]+/, 'string'], // Match the string content until a single quote or backslash
//   //   [/\\./, 'string.escape'], // Handle escape sequences
//   //   [/(?<!\\)'/, { token: 'string.quote.single', bracket: '@close', next: '@pop' }], // Match closing single quote
//   //   [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
//   // ],

//   // // Triple double-quoted string state
//   // multiLineDoubleString: [
//   //   [/[^\\"]+/, 'comment.doc'], // Match the string content until a triple quote or backslash
//   //   [/\\./, 'string.escape'], // Handle escape sequences
//   //   [/"""/, { token: 'string.quote.double.triple', bracket: '@close', next: '@pop' }], // Match closing triple double quote
//   //   [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
//   // ],

//   // // Triple single-quoted string state
//   // multiLineSingleString: [
//   //   [/[^\\']+/, 'comment.doc'], // Match the string content until a triple quote or backslash
//   //   [/\\./, 'string.escape'], // Handle escape sequences
//   //   [/'''/, { token: 'string.quote.single.triple', bracket: '@close', next: '@pop' }], // Match closing triple single quote
//   //   [/$/, 'string.invalid'], // Mark as invalid if not properly closed and reaches the end of the line
//   // ],
// // };

// // const root = [
// //   // from a.b.c...
// //   buildRegexMatchers(['keyword.import', 'white'], { next: '@importNamespaces' }),
// //   buildRegexMatchers(['keyword.from', 'white'], { next: '@fromImport' }),
//   // buildRegexMatchers(['keyword.import', 'white', 'namespace'], { next: '@namespacesNested' }),


//   // ...fromProviders,
//   // ...importProviders,

//   // Prioritize import statements to avoid conflicts
//   // [/(from)(\s+)([\w]+)(\.)([\w]+)(\.)([\w]+)(\s+)(import)(\s*\(?)/, [
//   //   'keyword', 'white', 'namespace', 'punctuation.delimiter', 'namespace', 'punctuation.delimiter', 'namespace', 'white', 'keyword', 'brackets.round',
//   // ]],

//   // import a.b.c as d
//   // [
//   //   /(import)(\s+)([\w]+)(\.)([\w]+)(\.)([\w]+)(\s*)(as)(\s*)([\w\.]+)?/,
//   //   ['keyword', 'white', 'namespace', 'punctuation.delimiter', 'namespace', 'punctuation.delimiter', 'namespace', 'white', 'keyword', 'white', 'namespace'],
//   // ],
//   // [
//   //   /\b(import)(\s+)([A-Za-z_][A-Za-z0-9_]*)(\.)([A-Za-z_][A-Za-z0-9_]*)*/,
//   //   ['keyword', 'white', 'namespace', 'punctuation.delimiter', 'namespace'],
//   // ],
//   // [
//   //   /\b(import)(\s+)([A-Za-z_][A-Za-z0-9_]*)(\.)([A-Za-z_][A-Za-z0-9_]*)(\.)([A-Za-z_][A-Za-z0-9_]*)*/,
//   //   ['keyword', 'white', 'namespace', 'punctuation.delimiter', 'namespace', 'punctuation.delimiter', 'namespace'],
//   // ],
//   // [/(import)(\s+)([\w\.]+)(\s+as\s+)([\w\.]+)?/, ['keyword', 'white', 'namespace', 'white', 'keyword', 'white', 'namespace']],
//   // [/(import)(\s+[\w\.]+)/, ['keyword', 'white', 'namespace']],

//   // // Uppercase constants at class level
//   // [/\b[A-Z_][A-Z_0-9]*\b(?=\s*=)/, 'enum'],

//   // // Constants in uppercase
//   // [/\b(None)\b/, 'literal.none'],
//   // [/\b([A-Z_][A-Z_0-9]*)\b/, 'constant'],
//   // [/(?<=[^\w\s]|^)\b[A-Z][A-Za-z0-9_]*\s*(\(\s*\))?/, 'type'],

//   // // Class declaration
//   // [/(class)(\s+)(\w+)(\s*)(:)/, ['keyword', 'white', 'type', 'white', 'punctuation.delimiter']], // Class declaration

//   // // Class declaration with inheritance
//   // [/(class)(\s+)(\w+)(\s*)(\()(\s*)(\w+)(\s*)(,?)(\s*)(\w+)?(\s*)(\))(\s*)(:)/,
//   //   [
//   //     'keyword', 'white', 'type', 'white', 'brackets.round', 'white',
//   //     'type', 'white', 'punctuation.delimiter', 'white', 'type', 'white',
//   //     'brackets.round', 'white', 'punctuation.delimiter',
//   //   ],
//   // ],

//   // // Detect regex strings by looking for patterns commonly enclosing regex in JavaScript/TypeScript
//   // [/(\/)([^\/\\]*(?:\\.[^\/\\]*)*)(\/[gimsuy]*)/, ['string.regex.delimiter', 'string.regex', 'string.regex.delimiter']],

//   // [/[\[\]]/, 'brackets.square'], // Brackets
//   // [/[()]/, 'brackets.round'], // Parentheses
//   // [/[{}]/, 'brackets.curly'], // Braces


//   // // Attributes with type hints
//   // [/(\.)(\w+)([:])/, ['punctuation.delimiter', 'attribute', 'punctuation.delimiter']], // Attributes with type hints
//   // [/(\.)(\w+)/, ['punctuation.delimiter', 'attribute']], // Attributes with type hints
//   // [/[:,;]/, 'punctuation.delimiter'], // Colons, semicolons, commas, and other delimiters

//   // // Booleans
//   // [/\b(True|False)\b/, 'literal.boolean'],

//   // // Function and Constructor definitions
//   // [/(\bdef\b)(\s+)(__\w+__)/, ['keyword', 'white', 'constructor']],  // Keyword def and special method (constructor)
//   // [/(\bdef\b)(\s+)([a-zA-Z_]\w*)/, ['keyword', 'white', 'function.name']],  // Keyword def and regular function

//   // // Self and cls in methods
//   // [/\b(self|cls)\b/, 'variable.self'],

//   // // Numeric literals
//   // [/\d+(\.\d+)?([eE][\-+]?\d+)?/, 'literal.number'],

//   // // Operators and delimiters
//   // [/[=+\-*/%&|^~<>!]+/, 'operator'],

//   // // Handle triple-quoted strings on a single line
//   // [/"""/, { token: 'string.quote.double.triple', bracket: '@open', next: '@multiLineDoubleString' }],
//   // [/'''/, { token: 'string.quote.single.triple', bracket: '@open', next: '@multiLineSingleString' }],

//   // // Handle invalid single-line strings only at the end of the line
//   // [/"([^"\\]|\\.)*$/, 'string.invalid'], // Invalid double-quoted string if not closed at end of line
//   // [/'([^'\\]|\\.)*$/, 'string.invalid'], // Invalid single-quoted string if not closed at end of the line

//   // // Start of regular double-quoted and single-quoted strings
//   // [/"/, { token: 'string.quote.double', bracket: '@open', next: '@doubleString' }],
//   // [/'/, { token: 'string.quote.single', bracket: '@open', next: '@singleString' }],

//   // // Comments
//   // [/#.*/, 'comment'],

//   // Keywords
//   // [/(^|\s)(^False|^None|^True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)(?=\s|$|[.,;:()])/, 'keyword'],

// // ];
