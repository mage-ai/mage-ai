// delimiter -> punctuation
const theme = {
  base: 'vs',
  inherit: false,
  rules: [
    // Testing
    { token: 'any', foreground: 'FFFFFF' },

    // Green
    { token: 'operator', foreground: '2FCB52' },
    { token: 'attribute', foreground: 'CBFE00D9' },
    { token: 'property', foreground: 'CBFE00D9' },

    // Purple types
    { token: 'type', foreground: '6B50D7' },
    { token: 'type.class', foreground: '6B50D7' },
    { token: 'type.class.class_definition', foreground: '6B50D7' },
    { token: 'type.primitive', foreground: 'B026FF' },
    { token: 'type.primitive.class_definition', foreground: 'B026FF' },

    // Orange: constants
    { token: 'constant', foreground: 'D5D7DC' },
    { token: 'enum', foreground: 'B4B8C0' },

    // Blue: functions
    { token: 'constructor', foreground: '4877FF' },
    { token: 'function.decorator', foreground: '5982ff' },
    { token: 'function.name', foreground: '00D0FF' },
    { token: 'string.link', foreground: '9ECBFF', fontStyle: 'underline' },

    // Gray
    { token: 'variable', foreground: 'C7CDDA' },
    { token: 'variable.self', foreground: 'B98D95' },

    // Red: keywords
    { token: 'keyword', foreground: 'FF144D' },
    { token: 'keyword.as', foreground: 'FF144D' },
    { token: 'keyword.class', foreground: 'FF144D' },
    { token: 'keyword.from', foreground: 'FF144D' },
    { token: 'keyword.import', foreground: 'FF144D' },
    { token: 'namespace', foreground: 'D1A2AB' },

    // Pink: brackets
    { token: 'brackets.square', foreground: 'FF99CC' },
    { token: 'brackets.round', foreground: 'FF4FF8' },
    { token: 'brackets.curly', foreground: 'CC1493' },
    // Teal
    { token: 'punctuation.dot', foreground: '00B4CC' },
    // Orange
    { token: 'punctuation.delimiter', foreground: 'FF9933' },
    { token: 'punctuation.comma', foreground: 'FF6700' },

    // Yellow: literals
    { token: 'literal.boolean', foreground: 'FFEBA3' },
    { token: 'literal.number', foreground: 'FFCC19' },
    { token: 'literal.none', foreground: 'CBFE00' },

    // Brown
    { token: 'comment', foreground: 'B89A75', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: 'DEBB92', fontStyle: 'italic' },
    { token: 'string.quote.double.triple', foreground: '927A58', fontStyle: 'italic' },
    { token: 'string.quote.single.triple', foreground: '927A58', fontStyle: 'italic' },

    // Green
    { token: 'string', foreground: '99CC00' },
    { token: 'string.quote.single', foreground: '24B400' },
    { token: 'string.quote.double', foreground: '24B400' },
    { token: 'string.escape', foreground: '2FCB52' },

    // White
    { token: 'string.invalid', foreground: 'F6540B', fontStyle: 'italic underline' },
    { token: 'string.regex', foreground: 'FFFFFF' },
    { token: 'string.regex.delimiter', foreground: 'A1A1A1' },
  ],
  colors: {
    'editor.foreground': 'A1A1A1',  // Gray
    'editor.background': '#000000E6',  // Black with opacity
    'editor.selectionBackground': '#44475a',  // Charcoal gray
    'editor.lineHighlightBackground': '#FF4FF84D',  // Lime green with opacity
    'editorCursor.foreground': '#f8f8f0',  // Eggshell
    'editorWhitespace.foreground': '#3B3A32',  // Dark gray
    'editorIndentGuide.activeBackground': '#9D550FB0',  // Reddish brown with opacity
    'editor.selectionHighlightBorder': '#222218',  // Very dark gray
// - `'editor.background'`: Background color of the editor.
// - `'editor.foreground'`: Foreground color of the editor.
// - `'editorCursor.foreground'`: Color of the cursor.
// - `'editor.lineHighlightBackground'`: Background color for the highlight of line at the cursor position.
// - `'editorLineNumber.foreground'`: Color of the line numbers.
// - `'editorLineNumber.activeForeground'`: Color of the active line number.
// - `'editorRuler.foreground'`: Color of the editor rulers.
// - `'editor.selectionBackground'`: Background color of selections.
// - `'editor.selectionHighlightBackground'`: Color for regions highlighted while selecting.
// - `'editor.findMatchBackground'`: Background color of the current search match.
// - `'editor.findMatchHighlightBackground'`: Background color of all other search matches.
// - `'editorGutter.background'`: Background color of the editor gutter.
// - `'editorGutter.addedBackground'`: Background color of the added line decorations.
// - `'editorGutter.modifiedBackground'`: Background color of the modified line decorations.
// - `'editorGutter.deletedBackground'`: Background color of the deleted line decorations.
// - `'diffEditor.insertedTextBackground'`: Background color for inserted text.
// - `'diffEditor.removedTextBackground'`: Background color for removed text.
// - `'editorOverviewRuler.border'`: Color of the overview ruler border.
// - `'editorOverviewRuler.findMatchForeground'`: Color of the overview ruler matches.
// - `'editorOverviewRuler.errorForeground'`: Color of the overview ruler error decorations.
// - `'editorOverviewRuler.warningForeground'`: Color of the overview ruler warning decorations.
// - `'editorOverviewRuler.infoForeground'`: Color of the overview ruler info decorations.
// - `'editorError.foreground'`: Color of error squiggles.
// - `'editorWarning.foreground'`: Color of warning squiggles.
// - `'editorInfo.foreground'`: Color of info squiggles.
// - `'editorBracketMatch.background'`: Background color of matching brackets.
// - `'editorBracketMatch.border'`: Border color of matching brackets.
// - `'editor.wordHighlightBackground'`: Background color of a symbol during read-access.
// - `'editor.wordHighlightStrongBackground'`: Background color of a symbol during write-access.
// - `'editorWhitespace.foreground'`: Color of the whitespace symbols.
// - `'editorIndentGuide.background'`: Color of the indent guides.
// - `'editorIndentGuide.activeBackground'`: Color of the active indent guide.
// - `'editor.lineNumbersBackground'`: Background color of line numbers decorations.
// - `'editor.lineNumbersForeground'`: Foreground color of line numbers decorations.
    // 'editorBracketMatch.background': '#FF4FF8',  // Pink
    // 'editorBracketMatch.border': '#FF4FF8',  // Pink
    //
    //     "editorBracketPairGuide.background1": "#CC1177",
    // 'editorBracketPairGuide.background2': '#5544DD',
    // 'editorBracketPairGuide.background3': '#CC6622',
    // 'editorBracketPairGuide.background4': '#779428',
    // 'editorBracketPairGuide.background5': '#009944',
    // 'editorBracketPairGuide.background6': '#1155DD',
    // 'editorBracketPairGuide.activeBackground1': '#EE2288',
    // 'editorBracketPairGuide.activeBackground2': '#8844FF',
    // 'editorBracketPairGuide.activeBackground3': '#FF5C0C',
    // 'editorBracketPairGuide.activeBackground4': '#99CC33',
    // 'editorBracketPairGuide.activeBackground5': '#00CC88',
    // 'editorBracketPairGuide.activeBackground6': '#0077FF',
    // 'editorBracketHighlight.foreground1': '#CC1177',
    // 'editorBracketHighlight.foreground2': '#5544DD',
    // 'editorBracketHighlight.foreground3': '#CC6622',
    // 'editorBracketHighlight.foreground4': '#779428',
    // 'editorBracketHighlight.foreground5': '#009944',
    // 'editorBracketHighlight.foreground6': '#1155DD',
    // 'editorBracketHighlight.unexpectedBracket.foreground': '#DD100C',
  },
};
export default theme;
