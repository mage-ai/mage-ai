import IDEThemeType from './interfaces';
import ThemeType from '@mana/themes/interfaces';

function build(theme: ThemeType): IDEThemeType {
  return {
    base: 'vs',
    inherit: false,
    rules: Object.entries(theme.ide.rules).reduce(
      (acc, [key, value]) =>
        acc.concat({
          ...value,
          token: key,
        }),
      [],
    ),
    colors: {
      'editor.foreground': '#000000', // Black
      'editor.background': theme.ide.background.color.base,
      'editorCursor.foreground': '#000000', // Black
      'editor.selectionBackground': '#ADD8E6', // Light blue
      'editor.selectionHighlightBorder': '#000000', // Black
      'editor.lineHighlightBackground': '#D3D3D3', // Light gray
      'editorLineNumber.foreground': '#000000', // Black
      'editorLineNumber.activeForeground': '#000000', // Black
      'editorRuler.foreground': '#8B0000', // Dark red
      'editorWhitespace.foreground': '#D3D3D3', // Light gray

      // Brackets
      'editorBracketHighlight.unexpectedBracket.foreground': '#FF4500', // Orange red
      'editorBracketMatch.background': '#ADD8E6', // Light blue
      'editorBracketMatch.border': '#000000', // Black
      'editorBracketPairGuide.background1': '#ADD8E6',
      'editorBracketPairGuide.background2': '#ADD8E6',
      'editorBracketPairGuide.background3': '#ADD8E6',
      'editorBracketPairGuide.background4': '#ADD8E6',
      'editorBracketPairGuide.background5': '#ADD8E6',
      'editorBracketPairGuide.background6': '#ADD8E6',
      'editorBracketPairGuide.activeBackground1': '#000000',
      'editorBracketPairGuide.activeBackground2': '#000000',
      'editorBracketPairGuide.activeBackground3': '#000000',
      'editorBracketPairGuide.activeBackground4': '#000000',
      'editorBracketPairGuide.activeBackground5': '#000000',
      'editorBracketPairGuide.activeBackground6': '#000000',
      'editorBracketHighlight.foreground1': '#000000',
      'editorBracketHighlight.foreground2': '#000000',
      'editorBracketHighlight.foreground3': '#000000',
      'editorBracketHighlight.foreground4': '#000000',
      'editorBracketHighlight.foreground5': '#000000',
      'editorBracketHighlight.foreground6': '#000000',

      // Version control
      'editor.selectionHighlightBackground': '#FFFF00', // Yellow
      'editor.findMatchBackground': '#FFFF00', // Yellow
      'editor.findMatchHighlightBackground': '#FFFF00', // Yellow
      'editorGutter.background': '#FFFFFF', // White
      'editorGutter.addedBackground': '#32CD32', // Green
      'editorGutter.modifiedBackground': '#FFD700', // Yellow
      'editorGutter.deletedBackground': '#FF6347', // Tomato

      // Ruler
      'editorOverviewRuler.border': '#000000', // Black
      'editorOverviewRuler.findMatchForeground': '#000000', // Black
      'editorOverviewRuler.errorForeground': '#FF0000', // Red
      'editorOverviewRuler.warningForeground': '#FFD700', // Yellow
      'editorOverviewRuler.infoForeground': '#0000FF', // Blue

      // Symbols/Info about code
      'editorError.foreground': '#FF0000', // Red
      'editorWarning.foreground': '#FFD700', // Yellow
      'editorInfo.foreground': '#00BFFF', // Deepskyblue

      // Guides
      'editorIndentGuide.background': '#D3D3D3',
      'editorIndentGuide.activeBackground': '#000000', // Black

      // Line numbers decorations
      'editor.lineNumbersBackground': '#FFFFFF',
      'editor.lineNumbersForeground': '#000000',

      // Diff editor
      // Background colors for inserted/removed text (left them undefined as they were in dark theme)
      // 'diffEditor.insertedTextBackground': '#',
      // 'diffEditor.removedTextBackground': '#',

      // Autocomplete
      'editorSuggestWidget.background': '#FFFFFF', // White
      'editorSuggestWidget.foreground': '#000000', // Black
      'editorSuggestWidget.border': '#000000', // Black
      'editorSuggestWidget.selectedForeground': '#FFFFFF',
      'editorSuggestWidget.selectedBackground': '#1E90FF', // Dodgerblue
      'editorSuggestWidget.selectedIconForeground': '#1E90FF', // Dodgerblue
      'editorSuggestWidget.highlightForeground': '#FF4500', // Orange red

      // Ghost text (inline suggestions)
      'editorGhostText.border': '#FF4500', // Orange red
      'editorGhostText.background': '#FFFFFF',
      'editorGhostText.foreground': '#FF4500', // Orange red
      'editor.inlineSuggest.highlightForeground': '#FF4500', // Orange red

      // Command palette
      'commandCenter.foreground': '#000000',
      'commandCenter.activeForeground': '#FFFFFF',
      'commandCenter.background': '#F0F0F0',
      'commandCenter.activeBackground': '#DCDCDC', // Light gray
      'commandCenter.border': '#D3D3D3', // Light gray
      'commandCenter.inactiveForeground': '#A9A9A9',
      'commandCenter.inactiveBorder': '#D3D3D3',
      'commandCenter.activeBorder': '#000000',
      'commandCenter.debuggingBackground': '#F0E68C', // Khaki

      // Keybindings
      'keybindingLabel.background': '#FFFFFF',
      'keybindingLabel.foreground': '#000000', // Black
      'keybindingLabel.border': '#D3D3D3', // Light gray
      'keybindingLabel.bottomBorder': '#000000', // Black

      // Widget
      'editorWidget.foreground': '#000000', // Black
      'editorWidget.background': '#FFFFFF', // White
      'editorWidget.border': '#D3D3D3', // Light gray

      // List
      'list.activeSelectionBackground': '#1E90FF', // Dodgerblue
      'list.activeSelectionForeground': '#FFFFFF', // White
      'list.activeSelectionIconForeground': '#FFFFFF', // White
      'list.focusOutline': '#FFD700', // Yellow
      'list.hoverBackground': '#D3D3D3', // Light gray
      'list.hoverForeground': '#000000', // Black
      'list.inactiveSelectionBackground': '#DCDCDC', // Light gray
    },
  };
}

export default build;
