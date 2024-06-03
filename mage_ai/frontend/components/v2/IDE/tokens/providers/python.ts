const mapping = {
  attribute: 'property',
  boolean: 'constant',
};

const KEY_WORDS = [
  'and',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
];

enum RegexEnum {
  'brackets.curly' = '([{}])',
  'brackets.round' = '([()])',
  'brackets.square' = '([\\[\\]])',
  'function.name' = '(\\b[_0-9a-z]+\\b)',
  'keyword.as' = '\\b(as)\\b',
  'keyword.class' = '(class)',
  'keyword.from' = '\\b(from)\\b',
  'keyword.import' = '\\b(import)\\b',
  'literal.none' = '\\b(None)\\b',
  'literal.boolean' = '\\b(True|False)\\b',
  'punctuation.delimiter' = '([:,;])',
  'punctuation.dot' = '(\\.)',
  constant = '(\\b[A-Z_0-9]+\\b)',
  namespace = '(\\b[a-zA-Z_][a-zA-Z0-9_]*\\b)',
  type = '(?<=[^\w\s]|^)\b[A-Z][A-Za-z0-9_]*\s*(\(\s*\))?',
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
};

const root = [
  // URL detection within quotes
  [
    /"\b((https?|ftp):\/\/[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})?(:\d+)?(\/[^\s"']*)?|www\.[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(:\d+)?(\/[^\s"']*)?|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}:\\d+\/[^\s"']+)\b"/,
    'string.link',
  ],
  [
    /'\b((https?|ftp):\/\/[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})?(:\d+)?(\/[^\s"']*)?|www\.[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(:\d+)?(\/[^\s"']*)?|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}:\\d+\/[^\s"']+)\b'/,
    'string.link',
  ],
  // Third case: URLs with `:port` and `/path` without `http(s)` or `www`.
  [/(")\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}:\d+\/[^\s"']+)\b(")/, ['string.quote.double', 'string.link', 'string.quote.double']],
  [/(')\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}:\d+\/[^\s"']+)\b(')/, ['string.quote.single', 'string.link', 'string.quote.single']],

  // Numeric literals
  [/\b\d+(\.\d+)?\b/, 'literal.number'],

  buildRegexMatchers(['keyword.import', 'white'], { next: '@importNamespaces' }),
  buildRegexMatchers(['keyword.from', 'white'], { next: '@fromImport' }),
  buildRegexMatchers(['keyword.import', 'white', 'namespace'], { next: '@resetState' }), // reset state after each match


  buildRegexMatchers(['brackets.curly']),
  buildRegexMatchers(['brackets.round']),
  buildRegexMatchers(['brackets.square']),

  buildRegexMatchers(['literal.boolean']),
  buildRegexMatchers(['literal.none']),

  [/\b[A-Z_][A-Z_0-9]*\b(?=\s*=)/, 'enum'], // This will override literal.number

  buildRegexMatchers(['constant']),
  buildRegexMatchers(['type']),
  // Test()
  [/\b([A-Z][A-Za-z0-9_]+)(\()/, ['type', 'brackets.round']],
  // ) -> type:
  [/(\s*)(->)(\s*)(\w+)(\s*)(:)/, ['white', 'operator', 'white', 'type', 'white', 'punctuation.delimiter']],

  // Class declaration
  [
    /(class)(\s+)(\w+)(\s*)(:)/,
    [
      'keyword', 'white', 'type', 'white', 'punctuation.delimiter',
    ],
  ],
  // Class declaration with inheritance
  [
    /(class)(\s+)(\w+)(\s*)(\()(\s*)(\w+)(\s*)(,?)(\s*)(\w+)?(\s*)(\))(\s*)(:)/,
    [
      'keyword', 'white', 'type', 'white', 'brackets.round', 'white',
      'type', 'white', 'punctuation.delimiter', 'white', 'type', 'white',
      'brackets.round', 'white', 'punctuation.delimiter',
    ],
  ],

  // Detect regex strings by looking for patterns commonly enclosing regex in JavaScript/TypeScript
  [
    /(\/)([^\/\\]*(?:\\.[^\/\\]*)*)(\/[gimsuy]*)/,
    [
      'string.regex.delimiter', 'string.regex', 'string.regex.delimiter',
    ],
  ],

  // Attributes with type hints
  // def __init__(self, id: int = None, df=None, name=None, api_key=None):
  [/(\,*)(\s*)(\w+)(\s*)([:])(\s*)(\w+)(\s*)(=)/, ['punctuation.delimiter', 'white', 'attribute', 'white', 'punctuation.delimiter', 'white', 'type', 'white', 'operator']],
  // def test(a=1, b: Optional[Any] = None) -> int:
  [/(\,*)(\s*)(\w+)(\s*)([:])(\s*)([A-Z][A-Z_0-9a-z]*)(\[)([A-Z_0-9a-z]+)/, ['punctuation.delimiter', 'white', 'attribute', 'white', 'punctuation.delimiter', 'white', 'type', 'brackets.square', 'type']],
  // return self.project_type + 1
  [/(\s+)(self|cls)(\.)(\w+)/, ['white', 'variable.self', 'punctuation.delimiter', 'attribute']],
  [/(,)(\s*)(\w+)(\s*)(=)(\s*)/, ['punctuation.delimiter', 'white', 'attribute', 'white', 'operator', 'white']],
  // [/(\.)(?!\d)[\w]+(:)/, ['punctuation.delimiter', 'attribute', 'punctuation.delimiter']],
  // [/(\.)(?!\d)[\w]+/, ['punctuation.delimiter', 'attribute']],

  // Variables
  // test.get_project_type()
  [/(\s+|^)(?!\d)(\w+)(\.)(\w+)/, ['white', 'variable', 'punctuation.delimiter', 'attribute']],
  // test = Test()
  [/(^\w+)(\s*)(=)(\s*)/, ['variable', 'white', 'operator', 'white']],

  // Self and cls in methods
  [/\b(self|cls)\b/, 'variable.self'],

  buildRegexMatchers(['punctuation.delimiter']),

  // Function and Constructor definitions
  [/(\bdef\b)(\s+)(__\w+__)/, ['keyword', 'white', 'constructor']],
  [/(\bdef\b)(\s+)([A-Z_0-9a-z]+)/, ['keyword', 'white', 'function.name']],
  buildRegexMatchers(['function.name', 'brackets.round']),


  // Operators and delimiters
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

  // Keywords
  [
      new RegExp(`(^|\\s)(?<!\.)(^False|^None|^True|^as|${KEY_WORDS.join('|')})(?=\\s|$|[.,;:()])`),
      'keyword',
  ],
];

const provider = {
  tokenizer: {
    root,
    ...states,
  },
};

export default provider;
