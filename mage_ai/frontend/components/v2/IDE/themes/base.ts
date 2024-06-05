// delimiter -> punctuation
const theme = {
  base: 'vs',
  inherit: false,
  rules: [
    // Testing
    { token: 'any', foreground: 'FFFFFF' },

    // Purple types
    { token: 'type', foreground: '#6B50D7' },
    { token: 'type.class', foreground: '#6B50D7', fontStyle: 'bold' },
    { token: 'type.class.class_definition', foreground: '#6B50D7' },
    { token: 'type.primitive', foreground: '#B026FF' },
    { token: 'type.primitive.class_definition', foreground: '#B026FF' },

    // Constants: brown
    { token: 'constant', foreground: '#E3D4C2' },
    { token: 'string.quote.double.triple', foreground: '#BFA78B', fontStyle: 'italic' },
    { token: 'string.quote.single.triple', foreground: '#BFA78B', fontStyle: 'italic' },
    { token: 'comment', foreground: '#AF8859', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: '#AF8859', fontStyle: 'italic' },

    // Blue: functions, instance variables
    { token: 'constructor', foreground: '#BDCEFF' },
    { token: 'attribute', foreground: '#81A1FF' },
    { token: 'property', foreground: '#81A1FF' },
    { token: 'function.name', foreground: '#517DFF', fontStyle: 'italic' },
    { token: 'function.decorator', foreground: '#2A60FE' },
    { token: 'string.link', foreground: '#0F4CFF', fontStyle: 'underline' },

    // Red: keywords
    { token: 'keyword.class', foreground: '#C72400', fontStyle: 'italic' },
    { token: 'namespace', foreground: '#FFD7E0' },
    { token: 'keyword.as', foreground: '#FFA3B9' },
    { token: 'keyword.from', foreground: '#FF547D' },
    { token: 'keyword', foreground: '#FF144D' },
    { token: 'keyword.import', foreground: '#EB0032' },

    // Variables
    { token: 'variable.self', foreground: 'B98D95' }, // Peach
    { token: 'punctuation.dot', foreground: '#C7CDDA' }, // Gray light
    { token: 'variable', foreground: '#A1A1A1' }, // Gray medium
    { token: 'enum', foreground: '#70747C' }, // Gray dark

    // Pink: brackets
    { token: 'brackets.square', foreground: 'FF99CC' },
    { token: 'brackets.round', foreground: 'FF4FF8' },
    { token: 'brackets.curly', foreground: 'CC1493' },

    // Invalid/Delimiters: orange
    { token: 'punctuation.delimiter', foreground: 'FF9933' },
    { token: 'punctuation.comma', foreground: 'FF6700' },
    { token: 'string.invalid', foreground: 'F6540B', fontStyle: 'italic underline' },

    // Literals/Operator: yellow
    { token: 'operator', foreground: '#CBFE00' },
    { token: 'literal.none', foreground: '#FFE662' },
    { token: 'literal.boolean', foreground: '#FFDA19' },
    { token: 'literal.number', foreground: '#F6C000' },

    // Green
    { token: 'string.regex.delimiter', foreground: '#C6EEDB' },
    { token: 'string', foreground: '#99CC00' },
    { token: 'string.regex', foreground: '#9DDFBF' },
    { token: 'string.escape', foreground: '#6BBF96' },
    { token: 'string.quote.double', foreground: '#37A46F' },
    { token: 'string.quote.single', foreground: '#00954C' },
  ],
  colors: {
    // https://gist.github.com/dcts/5b2af4c8b6918e7d35c4121f11d49fb1
    // Foreground color of the editor.
    'editor.foreground': 'A1A1A1', // Gray
    // E6 is 90%
    // D9 is 85%
    // B3 is 70%
    // 99 is 60%
    // 80 is 50%
    // 4D is 30%
    // 33 is 20%
    // 1A is 10%
    // 0D is 05%
    // 08 is 03%
    // 00 is 00% for blurred
    // ----------------------------------------------------------------------------------------------
    // Editor selection colors
    // ----------------------------------------------------------------------------------------------
    // Background color of the editor.
    'editor.background': '#000000B3', // Black transparent
    // Color of the blinking cursor.
    'editorCursor.foreground': '#CBFE00D9', // Yellow
    // Highlight/Selection colorss
    'editor.selectionBackground': '#1752FF99', // Blue
    'editor.selectionHighlightBorder': '#FFFFFF', // White
    // Background color for the highlight of line at the cursor position.
    'editor.lineHighlightBackground': '#FF144D4D', // Red
    // Color of the line numbers.
    'editorLineNumber.foreground': '#AEAEAE', // Gray
    // Color of the active line number.
    'editorLineNumber.activeForeground': '#CBFE00', // Yellow
    // ???
    'editorRuler.foreground': '#FF9933', // Orange
    // Whitespace dots
    'editorWhitespace.foreground': '#9B6CA780', // Dark gray
    // ----------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------
    // Brackets
    // ----------------------------------------------------------------------------------------------
    // Background color of matching brackets.
    'editorBracketMatch.background': '#C7CDDA', // Gray light
    // Border color of matching brackets.
    'editorBracketMatch.border': '#FF144D', // Red
    'editorBracketPairGuide.background1': '#CBFE004D',
    'editorBracketPairGuide.background2': '#CBFE004D',
    'editorBracketPairGuide.background3': '#CBFE004D',
    'editorBracketPairGuide.background4': '#CBFE004D',
    'editorBracketPairGuide.background5': '#CBFE004D',
    'editorBracketPairGuide.background6': '#CBFE004D',
    'editorBracketPairGuide.activeBackground1': '#CBFE00B3',
    'editorBracketPairGuide.activeBackground2': '#CBFE00B3',
    'editorBracketPairGuide.activeBackground3': '#CBFE00B3',
    'editorBracketPairGuide.activeBackground4': '#CBFE00B3',
    'editorBracketPairGuide.activeBackground5': '#CBFE00B3',
    'editorBracketPairGuide.activeBackground6': '#CBFE00B3',
    'editorBracketHighlight.foreground1': '#CBFE001A',
    'editorBracketHighlight.foreground2': '#CBFE001A',
    'editorBracketHighlight.foreground3': '#CBFE001A',
    'editorBracketHighlight.foreground4': '#CBFE001A',
    'editorBracketHighlight.foreground5': '#CBFE001A',
    'editorBracketHighlight.foreground6': '#CBFE001A',
    'editorBracketHighlight.unexpectedBracket.foreground': '#FFFFFF', // White
    // ----------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------
    // Version control
    // ----------------------------------------------------------------------------------------------
    // Color for regions highlighted while selecting.
    'editor.selectionHighlightBackground': '#6B50D7', // Purple
    // Background color of the current search match.
    'editor.findMatchBackground': '#6B50D7', // Purple
    // Background color of all other search matches.
    'editor.findMatchHighlightBackground': '#6B50D7', // Purple
    // Background color of the editor gutter.
    'editorGutter.background': '#00000033', // Black transparent
    // Background color of the added line decorations.
    'editorGutter.addedBackground': '#2FCB52', // Green
    // Background color of the modified line decorations.
    'editorGutter.modifiedBackground': '#CBFE00', // Yellow
    // Background color of the deleted line decorations.
    'editorGutter.deletedBackground': '#C72400', // Orange
    // ----------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------
    // Ruler
    // ----------------------------------------------------------------------------------------------
    // Color of the overview ruler border.
    'editorOverviewRuler.border': '#FFFFFF',
    // Color of the overview ruler matches.
    'editorOverviewRuler.findMatchForeground': '#FFFFFF',
    // Color of the overview ruler error decorations.
    'editorOverviewRuler.errorForeground': '#FFFFFF',
    // Color of the overview ruler warning decorations.
    'editorOverviewRuler.warningForeground': '#FFFFFF',
    // Color of the overview ruler info decorations.
    'editorOverviewRuler.infoForeground': '#FFFFFF',
    // ----------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------
    // Symbols/Info about code
    // ----------------------------------------------------------------------------------------------
    // Color of error squiggles.
    'editorError.foreground': '#FF144D', // Red
    // Color of warning squiggles.
    'editorWarning.foreground': '#CBFE00', // Yellow
    // Color of info squiggles.
    'editorInfo.foreground': '#2A60FE', // Blue
    // Background color of a symbol during read-access.
    // 'editor.wordHighlightBackground': '#',
    // Background color of a symbol during write-access.
    // 'editor.wordHighlightStrongBackground': '#',
    // Color of the whitespace symbols.
    // 'editorWhitespace.foreground': '#',
    // ----------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------
    // Guides
    // ----------------------------------------------------------------------------------------------
    // Color of the indent guides.
    'editorIndentGuide.background': '#A1A1A14D',
    // Color of the active indent guide.
    'editorIndentGuide.activeBackground': '#C7240099',
    // Background color of line numbers decorations.
    'editor.lineNumbersBackground': '#FFFFFF',
    // Foreground color of line numbers decorations.
    'editor.lineNumbersForeground': '#FFFFFF',
    // ----------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------
    // Diff editor
    // ----------------------------------------------------------------------------------------------
    // Background color for inserted text.
    // 'diffEditor.insertedTextBackground': '#',
    // Background color for removed text.
    // 'diffEditor.removedTextBackground': '#',
    // ----------------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------------
    // Autocomplete
    // ----------------------------------------------------------------------------------------------
    'editorSuggestWidget.background': '#FFFFFF', // Background color of the suggest widget
    'editorSuggestWidget.foreground': '#000000', // Text color of the options in the dropdwon suggest widget
    'editorSuggestWidget.border': '#CBFE00', // Border color of the suggest widget
    // Optional: Foreground color of the selected item; selected is when you press arrow down/up
    'editorSuggestWidget.selectedForeground': '#CBFE00',
    'editorSuggestWidget.selectedBackground': '#000000', // Background color of the selected item in the suggest widget
    'editorSuggestWidget.selectedIconForeground': '#CBFE00', // Optional: Foreground color of the selected item icon

    // Text color of the match highlights in the suggest widget when hovering over the option
    'editorSuggestWidget.highlightForeground': '#FF144D',
    // "editorWidget.background": "",
    // "editorWidget.border": "",

    // This sets the color of the inline suggestion text (ghost text or unselected proposal).
    'editorGhostText.foreground': '#CBFE00',
    // This sets the color of the highlighted portion of the text
    // in an inline suggestion that matches the current input.
    'editor.inlineSuggest.highlightForeground': '#FF144D',
  },
};

export default theme;
