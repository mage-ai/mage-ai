import IDEThemeType from './interfaces';
import ThemeType from '@mana/themes/interfaces';

// https://code.visualstudio.com/api/references/theme-color
// delimiter -> punctuation
function build(theme: ThemeType): IDEThemeType {
  return {
    base: 'vs-dark',
    inherit: true,
    rules: Object.entries(theme.ide.rules).reduce(
      (acc, [key, value]) =>
        acc.concat({
          ...value,
          token: key,
        }),
      [],
    ),
    colors: {
      // https://code.visualstudio.com/api/references/theme-color
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
      'editor.background': theme.ide.background.color.base, // Black transparent
      // Color of the blinking cursor.
      'editorCursor.foreground': '#CBFE00D9', // Yellow
      // Highlight/Selection colorss
      'editor.selectionBackground': '#1752FF99', // Blue
      'editor.selectionHighlightBorder': '#FFFFFF', // White
      // Background color for the highlight of line at the cursor position; active line background
      'editor.lineHighlightBackground': '#FF4FF84D', // Red
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
      // Background color of matching brackets
      // https://unpkg.com/browse/monaco-editor@0.34.0/dev/nls.metadata.json
      'editorBracketHighlight.unexpectedBracket.foreground': '#FFFFFF', // White
      // Border color of matching brackets.
      'editorBracketMatch.background': '#1752FFB3', // Blue
      'editorBracketMatch.border': '#CBFE00', // Yellow
      'editorBracketPairGuide.background1': '#CBFE004D', // Yellow
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
      'editorWarning.foreground': '#FFCC19', // Yellow
      // Color of info squiggles.
      'editorInfo.foreground': '#0F4CFF', // Blue
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
      'editorIndentGuide.background': '#C7CDDA4D',
      // Color of the active indent guide.
      'editorIndentGuide.activeBackground': '#FF144D', // Red
      // Background color of line numbers decorations.
      'editor.lineNumbersBackground': '#FFFFFF',
      // Foreground color of line numbers decorations.
      'editor.lineNumbersForeground': '#FFFFFF',
      // ----------------------------------------------------------------------------------------------
      // ----------------------------------------------------------------------------------------------
      // Diff editor
      // ----------------------------------------------------------------------------------------------
      // Background color for text that got inserted. The color must not be opaque so as not to hide underlying decorations.
      'diffEditor.insertedTextBackground': '#FFFFFF',
      // Outline color for the text that got inserted.
      'diffEditor.insertedTextBorder': '#FFFFFF',
      // Background color for text that got removed. The color must not be opaque so as not to hide underlying decorations.
      'diffEditor.removedTextBackground': '#FFFFFF',
      // Outline color for text that got removed.
      'diffEditor.removedTextBorder': '#FFFFFF',
      // Border color between the two text editors.
      'diffEditor.border': '#FFFFFF',
      // Color of the diff editor's diagonal fill. The diagonal fill is used in side-by-side diff views.
      'diffEditor.diagonalFill': '#FFFFFF',
      // Background color for lines that got inserted. The color must not be opaque so as not to hide underlying decorations.
      'diffEditor.insertedLineBackground': '#FFFFFF',
      // Background color for lines that got removed. The color must not be opaque so as not to hide underlying decorations.
      'diffEditor.removedLineBackground': '#FFFFFF',
      // Background color for the margin where lines got inserted.
      'diffEditorGutter.insertedLineBackground': '#FFFFFF',
      // Background color for the margin where lines got removed.
      'diffEditorGutter.removedLineBackground': '#FFFFFF',
      // Diff overview ruler foreground for inserted content.
      'diffEditorOverview.insertedForeground': '#FFFFFF',
      // Diff overview ruler foreground for removed content.
      'diffEditorOverview.removedForeground': '#FFFFFF',
      // The color of unchanged blocks in diff editor.
      'diffEditor.unchangedRegionBackground': '#FFFFFF',
      // The foreground color of unchanged blocks in the diff editor.
      'diffEditor.unchangedRegionForeground': '#FFFFFF',
      // The color of the shadow around unchanged region widgets.
      'diffEditor.unchangedRegionShadow': '#FFFFFF',
      // The background color of unchanged code in the diff editor.
      'diffEditor.unchangedCodeBackground': '#FFFFFF',
      // order: The border color for text that got moved in the diff editor.
      'diffEditor.move': '#FFFFFF',
      // order: The active border color for text that got moved in the diff editor.
      'diffEditor.moveActive': '#FFFFFF',
      // The background color of the diff editor's header
      'multiDiffEditor.headerBackground': '#FFFFFF',
      // The background color of the multi file diff editor
      'multiDiffEditor.background': '#FFFFFF',
      // The border color of the multi file diff editor
      'multiDiffEditor.border': '#FFFFFF',
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
      // Border color of the ghost text shown by inline completion providers and the suggest preview.
      'editorGhostText.border': '#CBFE00',
      // Background color of the ghost text in the editor.
      'editorGhostText.background': '#CBFE00',
      // Foreground color of the ghost text shown by inline completion providers and the suggest preview.
      'editorGhostText.foreground': '#CBFE00',
      // This sets the color of the highlighted portion of the text
      // in an inline suggestion that matches the current input.
      'editor.inlineSuggest.highlightForeground': '#FF144D',
      // ----------------------------------------------------------------------------------------------
      // ----------------------------------------------------------------------------------------------
      // Command palette
      // ----------------------------------------------------------------------------------------------
      // Foreground color of the Command Center.
      'commandCenter.foreground': '#000000',
      // Active foreground color of the Command Center.
      'commandCenter.activeForeground': '#000000',
      // Background color of the Command Center.
      'commandCenter.background': '#000000',
      // Active background color of the Command Center.
      'commandCenter.activeBackground': '#000000',
      // Border color of the Command Center.
      'commandCenter.border': '#000000',
      // Foreground color of the Command Center when the window is inactive.
      'commandCenter.inactiveForeground': '#000000',
      // Border color of the Command Center when the window is inactive.
      'commandCenter.inactiveBorder': '#000000',
      // Active border color of the Command Center.
      'commandCenter.activeBorder': '#000000',
      // Command Center background color when a program is being debugged.
      'commandCenter.debuggingBackground': '#000000',
      // Keybinding label background color. The keybinding label is used to represent a keyboard shortcut.
      'keybindingLabel.background': '#00000000',
      // Keybinding label foreground color. The keybinding label is used to represent a keyboard shortcut.
      'keybindingLabel.foreground': '#FFFFFF',
      // Keybinding label border color. The keybinding label is used to represent a keyboard shortcut.
      'keybindingLabel.border': '#CBFE00B3',
      // Keybinding label border bottom color. The keybinding label is used to represent a keyboard shortcut.
      'keybindingLabel.bottomBorder': '#CBFE00',
      // ----------------------------------------------------------------------------------------------
      // ----------------------------------------------------------------------------------------------
      // Widget
      // ----------------------------------------------------------------------------------------------
      // Foreground color of editor widgets, such as find/replace.
      'editorWidget.foreground': '#FFFFFF',
      // Background color of editor widgets, such as Find/Replace.
      'editorWidget.background': '#232429B3',
      // Border color of the editor widget unless the widget does not contain a border or defines its own border color.
      'editorWidget.border': '#FFFFFF',
      // // Border color of the resize bar of editor widgets. The color is only used if the widget chooses to have a resize border and if the color is not overridden by a widget.
      // 'editorWidget.resizeBorder': '#FFFFFF',
      // Foreground color of the editor hover.
      // 'editorHoverWidget.foreground': '#000000',
      // // Background color of the editor hover.
      // 'editorHoverWidget.background': '#FFFFFF',
      // // Border color of the editor hover.
      // 'editorHoverWidget.border': '#FFFFFF',
      // Foreground color of the active item in the parameter hint.
      // 'editorHoverWidget.highlightForeground': '#CBFE00',
      // Background color of the editor hover status bar.
      // 'editorHoverWidget.statusBarBackground': '#FF144D',
      // ----------------------------------------------------------------------------------------------
      // ----------------------------------------------------------------------------------------------
      // Scrollbar
      // ----------------------------------------------------------------------------------------------
      // // Scrollbar slider shadow to indicate that the view is scrolled.
      // 'scrollbar.shadow': '#000000',
      // // Scrollbar slider background color when clicked on.
      // 'scrollbarSlider.activeBackground': '#000000',
      // // Scrollbar slider background color.
      // 'scrollbarSlider.background': '#000000',
      // Scrollbar slider background color when hovering.
      // 'scrollbarSlider.hoverBackground': '#000000',
      // ----------------------------------------------------------------------------------------------
      // ----------------------------------------------------------------------------------------------
      // Lists
      // ----------------------------------------------------------------------------------------------
      // List/Tree background color for the selected item when the list/tree is active.
      'list.activeSelectionBackground': '#0000004D',
      // List/Tree foreground color for the selected item when the list/tree is active.
      'list.activeSelectionForeground': '#FFCC19',
      // // List/Tree icon foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.
      'list.activeSelectionIconForeground': '#FFCC19',
      //  // List/Tree drag and drop background when moving items around using the mouse.
      // 'list.dropBackground': '#000000',
      // // List/Tree background color for the focused item when the list/tree is active.
      // 'list.focusBackground': '#FFCC19',
      //  // List/Tree foreground color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.
      // 'list.focusForeground': '#FFCC19',
      // // List/Tree foreground color of the match highlights on actively focused items when searching inside the list/tree.
      // 'list.focusHighlightForeground': '#000000',
      //  // List/Tree outline color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.
      'list.focusOutline': '#CBFE004D',
      // // List/Tree outline color for the focused item when the list/tree is active and selected. An active list/tree has keyboard focus, an inactive does not.
      // 'list.focusAndSelectionOutline': '#000000',
      //  // List/Tree foreground color of the match highlights when searching inside the list/tree.
      // 'list.highlightForeground': '#000000',
      // // List/Tree background when hovering over items using the mouse.
      'list.hoverBackground': '#CBFE0033',
      // List/Tree foreground when hovering over items using the mouse.
      'list.hoverForeground': '#FFFFFF',
      // List/Tree background color for the selected item when the list/tree is inactive.
      'list.inactiveSelectionBackground': '#000000',
      //  // List/Tree foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.
      // 'list.inactiveSelectionForeground': '#000000',
      // // List/Tree icon foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.
      // 'list.inactiveSelectionIconForeground': '#000000',
      //  // List background color for the focused item when the list is inactive. An active list has keyboard focus, an inactive does not. Currently only supported in lists.
      // 'list.inactiveFocusBackground': '#000000',
      // // List/Tree outline color for the focused item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.
      // 'list.inactiveFocusOutline': '#000000',
      //  // List/Tree foreground color for invalid items, for example an unresolved root in explorer.
      // 'list.invalidItemForeground': '#000000',
      // // Foreground color of list items containing errors.
      // 'list.errorForeground': '#000000',
      //  // Foreground color of list items containing warnings.
      // 'list.warningForeground': '#000000',
      // // List/Tree Filter background color of typed text when searching inside the list/tree.
      // 'listFilterWidget.background': '#000000',
      //  // List/Tree Filter Widget's outline color of typed text when searching inside the list/tree.
      // 'listFilterWidget.outline': '#000000',
      //  // List/Tree Filter Widget's outline color when no match is found of typed text when searching inside the list/tree.
      // 'listFilterWidget.noMatchesOutline': '#000000',
      //  // Shadow color of the type filter widget in lists and tree.
      // 'listFilterWidget.shadow': '#000000',
      // // Background color of the filtered matches in lists and trees.
      // 'list.filterMatchBackground': '#000000',
      //  // Border color of the filtered matches in lists and trees.
      // 'list.filterMatchBorder': '#000000',
      // // List/Tree foreground color for items that are deemphasized.
      // 'list.deemphasizedForeground': '#000000',
      //  // List/Tree drag and drop border color when moving items between items when using the mouse.
      // 'list.dropBetweenBackground': '#000000',
      // // Tree Widget's stroke color for indent guides.
      // 'tree.indentGuidesStroke': '#000000',
      // // Tree stroke color for the indentation guides that are not active.
      // 'tree.inactiveIndentGuidesStroke': '#000000',
      //  // Tree stroke color for the indentation guides.
      // 'tree.tableColumnsBorder': '#000000',
      //  // Background color for odd table rows.
      // 'tree.tableOddRowsBackground': '#000000',
    },
  };
}

export default build;
