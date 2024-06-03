# Example
[Twilight](https://github.com/brijeshb42/monaco-themes/blob/master/themes/Twilight.json)

## Theme colors
1. https://code.visualstudio.com/api/references/theme-color
1. https://code.visualstudio.com/docs/getstarted/themes
1. https://code.visualstudio.com/docs/getstarted/themes#_create-your-own-color-theme
1. https://code.visualstudio.com/api/extension-guides/color-theme#create-a-new-color-theme

### `base`
- `base: 'vs'` or `'vs-dark'`
  - **Description:** Base theme to inherit properties from (light vs dark).

### `inherit`
- `inherit: true` or `false`
  - **Description:** Whether the theme should inherit the rules from the base theme.

### `rules`
- **Syntax Highlighting:**
  - `token: 'comment'`, `foreground: '#ffa500'`, `fontStyle: 'italic underline'`
  - **Description:** Define colors and styles for different tokens (like comments, keywords, strings, etc.).

### `colors`
- **Editor Background and Foreground:**
  - `'editor.background'`: Background color of the editor.
  - `'editor.foreground'`: Foreground color of the editor.

- **Cursor and Line Highlight:**
  - `'editorCursor.foreground'`: Color of the cursor.
  - `'editor.lineHighlightBackground'`: Background color for the highlight of line at the cursor position.

- **Line Numbers and Rulers:**
  - `'editorLineNumber.foreground'`: Color of the line numbers.
  - `'editorLineNumber.activeForeground'`: Color of the active line number.
  - `'editorRuler.foreground'`: Color of the editor rulers.

- **Selection and Search Match:**
  - `'editor.selectionBackground'`: Background color of selections.
  - `'editor.selectionHighlightBackground'`: Color for regions highlighted while selecting.
  - `'editor.findMatchBackground'`: Background color of the current search match.
  - `'editor.findMatchHighlightBackground'`: Background color of all other search matches.

- **Gutter Decorations:**
  - `'editorGutter.background'`: Background color of the editor gutter.
  - `'editorGutter.addedBackground'`: Background color of the added line decorations.
  - `'editorGutter.modifiedBackground'`: Background color of the modified line decorations.
  - `'editorGutter.deletedBackground'`: Background color of the deleted line decorations.

- **Diff Editor Colors:**
  - `'diffEditor.insertedTextBackground'`: Background color for inserted text.
  - `'diffEditor.removedTextBackground'`: Background color for removed text.

- **Overview Ruler:**
  - `'editorOverviewRuler.border'`: Color of the overview ruler border.
  - `'editorOverviewRuler.findMatchForeground'`: Color of the overview ruler matches.
  - `'editorOverviewRuler.errorForeground'`: Color of the overview ruler error decorations.
  - `'editorOverviewRuler.warningForeground'`: Color of the overview ruler warning decorations.
  - `'editorOverviewRuler.infoForeground'`: Color of the overview ruler info decorations.

- **Error and Warning:**
  - `'editorError.foreground'`: Color of error squiggles.
  - `'editorWarning.foreground'`: Color of warning squiggles.
  - `'editorInfo.foreground'`: Color of info squiggles.

- **Bracket Match and Guide:**
  - `'editorBracketMatch.background'`: Background color of matching brackets.
  - `'editorBracketMatch.border'`: Border color of matching brackets.

- **Word Highlight:**
  - `'editor.wordHighlightBackground'`: Background color of a symbol during read-access.
  - `'editor.wordHighlightStrongBackground'`: Background color of a symbol during write-access.

- **Whitespace:**
  - `'editorWhitespace.foreground'`: Color of the whitespace symbols.

- **Indent Guides:**
  - `'editorIndentGuide.background'`: Color of the indent guides.
  - `'editorIndentGuide.activeBackground'`: Color of the active indent guide.

- **Line Decorations and Borders:**
  - `'editor.lineNumbersBackground'`: Background color of line numbers decorations.
  - `'editor.lineNumbersForeground'`: Foreground color of line numbers decorations.

---

```json
{
  "base": "vs-dark",
  "inherit": true,
  "rules": [
    {
      "background": "282a36",
      "token": ""
    },
    {
      "foreground": "6272a4",
      "token": "comment"
    },
    {
      "foreground": "f1fa8c",
      "token": "string"
    },
    {
      "foreground": "bd93f9",
      "token": "constant.numeric"
    },
    {
      "foreground": "bd93f9",
      "token": "constant.language"
    },
    {
      "foreground": "bd93f9",
      "token": "constant.character"
    },
    {
      "foreground": "bd93f9",
      "token": "constant.other"
    },
    {
      "foreground": "ffb86c",
      "token": "variable.other.readwrite.instance"
    },
    {
      "foreground": "ff79c6",
      "token": "constant.character.escaped"
    },
    {
      "foreground": "ff79c6",
      "token": "constant.character.escape"
    },
    {
      "foreground": "ff79c6",
      "token": "string source"
    },
    {
      "foreground": "ff79c6",
      "token": "string source.ruby"
    },
    {
      "foreground": "ff79c6",
      "token": "keyword"
    },
    {
      "foreground": "ff79c6",
      "token": "storage"
    },
    {
      "foreground": "8be9fd",
      "fontStyle": "italic",
      "token": "storage.type"
    },
    {
      "foreground": "50fa7b",
      "fontStyle": "underline",
      "token": "entity.name.class"
    },
    {
      "foreground": "50fa7b",
      "fontStyle": "italic underline",
      "token": "entity.other.inherited-class"
    },
    {
      "foreground": "50fa7b",
      "token": "entity.name.function"
    },
    {
      "foreground": "ffb86c",
      "fontStyle": "italic",
      "token": "variable.parameter"
    },
    {
      "foreground": "ff79c6",
      "token": "entity.name.tag"
    },
    {
      "foreground": "50fa7b",
      "token": "entity.other.attribute-name"
    },
    {
      "foreground": "8be9fd",
      "token": "support.function"
    },
    {
      "foreground": "6be5fd",
      "token": "support.constant"
    },
    {
      "foreground": "66d9ef",
      "fontStyle": " italic",
      "token": "support.type"
    },
    {
      "foreground": "66d9ef",
      "fontStyle": " italic",
      "token": "support.class"
    },
    {
      "foreground": "f8f8f0",
      "background": "ff79c6",
      "token": "invalid"
    },
    {
      "foreground": "f8f8f0",
      "background": "bd93f9",
      "token": "invalid.deprecated"
    },
    {
      "foreground": "cfcfc2",
      "token": "meta.structure.dictionary.json string.quoted.double.json"
    },
    {
      "foreground": "6272a4",
      "token": "meta.diff"
    },
    {
      "foreground": "6272a4",
      "token": "meta.diff.header"
    },
    {
      "foreground": "ff79c6",
      "token": "markup.deleted"
    },
    {
      "foreground": "50fa7b",
      "token": "markup.inserted"
    },
    {
      "foreground": "e6db74",
      "token": "markup.changed"
    },
    {
      "foreground": "bd93f9",
      "token": "constant.numeric.line-number.find-in-files - match"
    },
    {
      "foreground": "e6db74",
      "token": "entity.name.filename"
    },
    {
      "foreground": "f83333",
      "token": "message.error"
    },
    {
      "foreground": "eeeeee",
      "token": "punctuation.definition.string.begin.json - meta.structure.dictionary.value.json"
    },
    {
      "foreground": "eeeeee",
      "token": "punctuation.definition.string.end.json - meta.structure.dictionary.value.json"
    },
    {
      "foreground": "8be9fd",
      "token": "meta.structure.dictionary.json string.quoted.double.json"
    },
    {
      "foreground": "f1fa8c",
      "token": "meta.structure.dictionary.value.json string.quoted.double.json"
    },
    {
      "foreground": "50fa7b",
      "token": "meta meta meta meta meta meta meta.structure.dictionary.value string"
    },
    {
      "foreground": "ffb86c",
      "token": "meta meta meta meta meta meta.structure.dictionary.value string"
    },
    {
      "foreground": "ff79c6",
      "token": "meta meta meta meta meta.structure.dictionary.value string"
    },
    {
      "foreground": "bd93f9",
      "token": "meta meta meta meta.structure.dictionary.value string"
    },
    {
      "foreground": "50fa7b",
      "token": "meta meta meta.structure.dictionary.value string"
    },
    {
      "foreground": "ffb86c",
      "token": "meta meta.structure.dictionary.value string"
    }
  ],
  "colors": {
    "editor.foreground": "#f8f8f2",
    "editor.background": "#282a36",
    "editor.selectionBackground": "#44475a",
    "editor.lineHighlightBackground": "#44475a",
    "editorCursor.foreground": "#f8f8f0",
    "editorWhitespace.foreground": "#3B3A32",
    "editorIndentGuide.activeBackground": "#9D550FB0",
    "editor.selectionHighlightBorder": "#222218"
  }
}
```
---

// A list of color names:
'foreground' // Overall foreground color. This color is only used if not overridden by a component.
'errorForeground' // Overall foreground color for error messages. This color is only used if not overridden by a component.
'descriptionForeground' // Foreground color for description text providing additional information, for example for a label.
'focusBorder' // Overall border color for focused elements. This color is only used if not overridden by a component.
'contrastBorder' // An extra border around elements to separate them from others for greater contrast.
'contrastActiveBorder' // An extra border around active elements to separate them from others for greater contrast.
'selection.background' // The background color of text selections in the workbench (e.g. for input fields or text areas). Note that this does not apply to selections within the editor.
'textSeparator.foreground' // Color for text separators.
'textLink.foreground' // Foreground color for links in text.
'textLink.activeForeground' // Foreground color for active links in text.
'textPreformat.foreground' // Foreground color for preformatted text segments.
'textBlockQuote.background' // Background color for block quotes in text.
'textBlockQuote.border' // Border color for block quotes in text.
'textCodeBlock.background' // Background color for code blocks in text.
'widget.shadow' // Shadow color of widgets such as find/replace inside the editor.
'input.background' // Input box background.
'input.foreground' // Input box foreground.
'input.border' // Input box border.
'inputOption.activeBorder' // Border color of activated options in input fields.
'input.placeholderForeground' // Input box foreground color for placeholder text.
'inputValidation.infoBackground' // Input validation background color for information severity.
'inputValidation.infoBorder' // Input validation border color for information severity.
'inputValidation.warningBackground' // Input validation background color for information warning.
'inputValidation.warningBorder' // Input validation border color for warning severity.
'inputValidation.errorBackground' // Input validation background color for error severity.
'inputValidation.errorBorder' // Input validation border color for error severity.
'dropdown.background' // Dropdown background.
'dropdown.foreground' // Dropdown foreground.
'dropdown.border' // Dropdown border.
'list.focusBackground' // List/Tree background color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.
'list.focusForeground' // List/Tree foreground color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.
'list.activeSelectionBackground' // List/Tree background color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.
'list.activeSelectionForeground' // List/Tree foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.
'list.inactiveSelectionBackground' // List/Tree background color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.
'list.inactiveSelectionForeground' // List/Tree foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.
'list.hoverBackground' // List/Tree background when hovering over items using the mouse.
'list.hoverForeground' // List/Tree foreground when hovering over items using the mouse.
'list.dropBackground' // List/Tree drag and drop background when moving items around using the mouse.
'list.highlightForeground' // List/Tree foreground color of the match highlights when searching inside the list/tree.
'pickerGroup.foreground' // Quick picker color for grouping labels.
'pickerGroup.border' // Quick picker color for grouping borders.
'button.foreground' // Button foreground color.
'button.background' // Button background color.
'button.hoverBackground' // Button background color when hovering.
'badge.background' // Badge background color. Badges are small information labels, e.g. for search results count.
'badge.foreground' // Badge foreground color. Badges are small information labels, e.g. for search results count.
'scrollbar.shadow' // Scrollbar shadow to indicate that the view is scrolled.
'scrollbarSlider.background' // Slider background color.
'scrollbarSlider.hoverBackground' // Slider background color when hovering.
'scrollbarSlider.activeBackground' // Slider background color when active.
'progressBar.background' // Background color of the progress bar that can show for long running operations.
'editor.background' // Editor background color.
'editor.foreground' // Editor default foreground color.
'editorWidget.background' // Background color of editor widgets, such as find/replace.
'editorWidget.border' // Border color of editor widgets. The color is only used if the widget chooses to have a border and if the color is not overridden by a widget.
'editor.selectionBackground' // Color of the editor selection.
'editor.selectionForeground' // Color of the selected text for high contrast.
'editor.inactiveSelectionBackground' // Color of the selection in an inactive editor.
'editor.selectionHighlightBackground' // Color for regions with the same content as the selection.
'editor.findMatchBackground' // Color of the current search match.
'editor.findMatchHighlightBackground' // Color of the other search matches.
'editor.findRangeHighlightBackground' // Color the range limiting the search.
'editor.hoverHighlightBackground' // Highlight below the word for which a hover is shown.
'editorHoverWidget.background' // Background color of the editor hover.
'editorHoverWidget.border' // Border color of the editor hover.
'editorLink.activeForeground' // Color of active links.
'diffEditor.insertedTextBackground' // Background color for text that got inserted.
'diffEditor.removedTextBackground' // Background color for text that got removed.
'diffEditor.insertedTextBorder' // Outline color for the text that got inserted.
'diffEditor.removedTextBorder' // Outline color for text that got removed.
'merge.currentHeaderBackground' // Current header background in inline merge-conflicts.
'merge.currentContentBackground' // Current content background in inline merge-conflicts.
'merge.incomingHeaderBackground' // Incoming header background in inline merge-conflicts.
'merge.incomingContentBackground' // Incoming content background in inline merge-conflicts.
'merge.commonHeaderBackground' // Common ancestor header background in inline merge-conflicts.
'merge.commonContentBackground' // Common ancester content background in inline merge-conflicts.
'merge.border' // Border color on headers and the splitter in inline merge-conflicts.
'editorOverviewRuler.currentContentForeground' // Current overview ruler foreground for inline merge-conflicts.
'editorOverviewRuler.incomingContentForeground' // Incoming overview ruler foreground for inline merge-conflicts.
'editorOverviewRuler.commonContentForeground' // Common ancestor overview ruler foreground for inline merge-conflicts.
'editor.lineHighlightBackground' // Background color for the highlight of line at the cursor position.
'editor.lineHighlightBorder' // Background color for the border around the line at the cursor position.
'editor.rangeHighlightBackground' // Background color of highlighted ranges, like by quick open and find features.
'editorCursor.foreground' // Color of the editor cursor.
'editorWhitespace.foreground' // Color of whitespace characters in the editor.
'editorIndentGuide.background' // Color of the editor indentation guides.
'editorLineNumber.foreground' // Color of editor line numbers.
'editorRuler.foreground' // Color of the editor rulers.
'editorCodeLens.foreground' // Foreground color of editor code lenses
'editorBracketMatch.background' // Background color behind matching brackets
'editorBracketMatch.border' // Color for matching brackets boxes
'editorOverviewRuler.border' // Color of the overview ruler border.
'editorGutter.background' // Background color of the editor gutter. The gutter contains the glyph margins and the line numbers.
'editorError.foreground' // Foreground color of error squigglies in the editor.
'editorError.border' // Border color of error squigglies in the editor.
'editorWarning.foreground' // Foreground color of warning squigglies in the editor.
'editorWarning.border' // Border color of warning squigglies in the editor.
'editorMarkerNavigationError.background' // Editor marker navigation widget error color.
'editorMarkerNavigationWarning.background' // Editor marker navigation widget warning color.
'editorMarkerNavigation.background' // Editor marker navigation widget background.
'editorSuggestWidget.background' // Background color of the suggest widget.
'editorSuggestWidget.border' // Border color of the suggest widget.
'editorSuggestWidget.foreground' // Foreground color of the suggest widget.
'editorSuggestWidget.selectedBackground' // Background color of the selected entry in the suggest widget.
'editorSuggestWidget.highlightForeground' // Color of the match highlights in the suggest widget.
'editor.wordHighlightBackground' // Background color of a symbol during read-access, like reading a variable.
'editor.wordHighlightStrongBackground' // Background color of a symbol during write-access, like writing to a variable.
'peekViewTitle.background' // Background color of the peek view title area.
'peekViewTitleLabel.foreground' // Color of the peek view title.
'peekViewTitleDescription.foreground' // Color of the peek view title info.
'peekView.border' // Color of the peek view borders and arrow.
'peekViewResult.background' // Background color of the peek view result list.
'peekViewResult.lineForeground' // Foreground color for line nodes in the peek view result list.
'peekViewResult.fileForeground' // Foreground color for file nodes in the peek view result list.
'peekViewResult.selectionBackground' // Background color of the selected entry in the peek view result list.
'peekViewResult.selectionForeground' // Foreground color of the selected entry in the peek view result list.
'peekViewEditor.background' // Background color of the peek view editor.
'peekViewEditorGutter.background' // Background color of the gutter in the peek view editor.
'peekViewResult.matchHighlightBackground' // Match highlight color in the peek view result list.
'peekViewEditor.matchHighlightBackground' // Match highlight color in the peek view editor.

/*
var colors = require('vs/platform/registry/common/platform').Registry.data['base.contributions.colors'].colorSchema.properties
Object.keys(colors).forEach(function(key) {
var val = colors[key];
console.log( '//' + val.description + '\n' + key);
})
*/

```
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { IStandaloneThemeData } from 'vs/editor/standalone/common/standaloneThemeService';
import { editorBackground, editorForeground, editorSelectionHighlight, editorInactiveSelection } from 'vs/platform/theme/common/colorRegistry';
import { editorIndentGuides } from 'vs/editor/common/view/editorColorRegistry';

/* -------------------------------- Begin vs theme -------------------------------- */
export const vs: IStandaloneThemeData = {
	base: 'vs',
	inherit: false,
	rules: [
		{ token: '', foreground: '000000', background: 'fffffe' },
		{ token: 'invalid', foreground: 'cd3131' },
		{ token: 'emphasis', fontStyle: 'italic' },
		{ token: 'strong', fontStyle: 'bold' },

		{ token: 'variable', foreground: '001188' },
		{ token: 'variable.predefined', foreground: '4864AA' },
		{ token: 'constant', foreground: 'dd0000' },
		{ token: 'comment', foreground: '008000' },
		{ token: 'number', foreground: '09885A' },
		{ token: 'number.hex', foreground: '3030c0' },
		{ token: 'regexp', foreground: '800000' },
		{ token: 'annotation', foreground: '808080' },
		{ token: 'type', foreground: '008080' },

		{ token: 'delimiter', foreground: '000000' },
		{ token: 'delimiter.html', foreground: '383838' },
		{ token: 'delimiter.xml', foreground: '0000FF' },

		{ token: 'tag', foreground: '800000' },
		{ token: 'tag.id.jade', foreground: '4F76AC' },
		{ token: 'tag.class.jade', foreground: '4F76AC' },
		{ token: 'meta.scss', foreground: '800000' },
		{ token: 'metatag', foreground: 'e00000' },
		{ token: 'metatag.content.html', foreground: 'FF0000' },
		{ token: 'metatag.html', foreground: '808080' },
		{ token: 'metatag.xml', foreground: '808080' },
		{ token: 'metatag.php', fontStyle: 'bold' },

		{ token: 'key', foreground: '863B00' },
		{ token: 'string.key.json', foreground: 'A31515' },
		{ token: 'string.value.json', foreground: '0451A5' },

		{ token: 'attribute.name', foreground: 'FF0000' },
		{ token: 'attribute.value', foreground: '0451A5' },
		{ token: 'attribute.value.number', foreground: '09885A' },
		{ token: 'attribute.value.unit', foreground: '09885A' },
		{ token: 'attribute.value.html', foreground: '0000FF' },
		{ token: 'attribute.value.xml', foreground: '0000FF' },

		{ token: 'string', foreground: 'A31515' },
		{ token: 'string.html', foreground: '0000FF' },
		{ token: 'string.sql', foreground: 'FF0000' },
		{ token: 'string.yaml', foreground: '0451A5' },

		{ token: 'keyword', foreground: '0000FF' },
		{ token: 'keyword.json', foreground: '0451A5' },
		{ token: 'keyword.flow', foreground: 'AF00DB' },
		{ token: 'keyword.flow.scss', foreground: '0000FF' },

		{ token: 'operator.scss', foreground: '666666' },
		{ token: 'operator.sql', foreground: '778899' },
		{ token: 'operator.swift', foreground: '666666' },
		{ token: 'predefined.sql', foreground: 'FF00FF' },
	],
	colors: {
		[editorBackground]: '#FFFFFE',
		[editorForeground]: '#000000',
		[editorInactiveSelection]: '#E5EBF1',
		[editorIndentGuides]: '#D3D3D3',
		[editorSelectionHighlight]: '#ADD6FF4D'
	}
};
/* -------------------------------- End vs theme -------------------------------- */


/* -------------------------------- Begin vs-dark theme -------------------------------- */
export const vs_dark: IStandaloneThemeData = {
	base: 'vs-dark',
	inherit: false,
	rules: [
		{ token: '', foreground: 'D4D4D4', background: '1E1E1E' },
		{ token: 'invalid', foreground: 'f44747' },
		{ token: 'emphasis', fontStyle: 'italic' },
		{ token: 'strong', fontStyle: 'bold' },

		{ token: 'variable', foreground: '74B0DF' },
		{ token: 'variable.predefined', foreground: '4864AA' },
		{ token: 'variable.parameter', foreground: '9CDCFE' },
		{ token: 'constant', foreground: '569CD6' },
		{ token: 'comment', foreground: '608B4E' },
		{ token: 'number', foreground: 'B5CEA8' },
		{ token: 'number.hex', foreground: '5BB498' },
		{ token: 'regexp', foreground: 'B46695' },
		{ token: 'annotation', foreground: 'cc6666' },
		{ token: 'type', foreground: '3DC9B0' },

		{ token: 'delimiter', foreground: 'DCDCDC' },
		{ token: 'delimiter.html', foreground: '808080' },
		{ token: 'delimiter.xml', foreground: '808080' },

		{ token: 'tag', foreground: '569CD6' },
		{ token: 'tag.id.jade', foreground: '4F76AC' },
		{ token: 'tag.class.jade', foreground: '4F76AC' },
		{ token: 'meta.scss', foreground: 'A79873' },
		{ token: 'meta.tag', foreground: 'CE9178' },
		{ token: 'metatag', foreground: 'DD6A6F' },
		{ token: 'metatag.content.html', foreground: '9CDCFE' },
		{ token: 'metatag.html', foreground: '569CD6' },
		{ token: 'metatag.xml', foreground: '569CD6' },
		{ token: 'metatag.php', fontStyle: 'bold' },

		{ token: 'key', foreground: '9CDCFE' },
		{ token: 'string.key.json', foreground: '9CDCFE' },
		{ token: 'string.value.json', foreground: 'CE9178' },

		{ token: 'attribute.name', foreground: '9CDCFE' },
		{ token: 'attribute.value', foreground: 'CE9178' },
		{ token: 'attribute.value.number.css', foreground: 'B5CEA8' },
		{ token: 'attribute.value.unit.css', foreground: 'B5CEA8' },
		{ token: 'attribute.value.hex.css', foreground: 'D4D4D4' },

		{ token: 'string', foreground: 'CE9178' },
		{ token: 'string.sql', foreground: 'FF0000' },

		{ token: 'keyword', foreground: '569CD6' },
		{ token: 'keyword.flow', foreground: 'C586C0' },
		{ token: 'keyword.json', foreground: 'CE9178' },
		{ token: 'keyword.flow.scss', foreground: '569CD6' },

		{ token: 'operator.scss', foreground: '909090' },
		{ token: 'operator.sql', foreground: '778899' },
		{ token: 'operator.swift', foreground: '909090' },
		{ token: 'predefined.sql', foreground: 'FF00FF' },
	],
	colors: {
		[editorBackground]: '#1E1E1E',
		[editorForeground]: '#D4D4D4',
		[editorInactiveSelection]: '#3A3D41',
		[editorIndentGuides]: '#404040',
		[editorSelectionHighlight]: '#ADD6FF26'
	}
};
/* -------------------------------- End vs-dark theme -------------------------------- */



/* -------------------------------- Begin hc-black theme -------------------------------- */
export const hc_black: IStandaloneThemeData = {
	base: 'hc-black',
	inherit: false,
	rules: [
		{ token: '', foreground: 'FFFFFF', background: '000000' },
		{ token: 'invalid', foreground: 'f44747' },
		{ token: 'emphasis', fontStyle: 'italic' },
		{ token: 'strong', fontStyle: 'bold' },

		{ token: 'variable', foreground: '1AEBFF' },
		{ token: 'variable.parameter', foreground: '9CDCFE' },
		{ token: 'constant', foreground: '569CD6' },
		{ token: 'comment', foreground: '608B4E' },
		{ token: 'number', foreground: 'FFFFFF' },
		{ token: 'regexp', foreground: 'C0C0C0' },
		{ token: 'annotation', foreground: '569CD6' },
		{ token: 'type', foreground: '3DC9B0' },

		{ token: 'delimiter', foreground: 'FFFF00' },
		{ token: 'delimiter.html', foreground: 'FFFF00' },

		{ token: 'tag', foreground: '569CD6' },
		{ token: 'tag.id.jade', foreground: '4F76AC' },
		{ token: 'tag.class.jade', foreground: '4F76AC' },
		{ token: 'meta', foreground: 'D4D4D4' },
		{ token: 'meta.tag', foreground: 'CE9178' },
		{ token: 'metatag', foreground: '569CD6' },
		{ token: 'metatag.content.html', foreground: '1AEBFF' },
		{ token: 'metatag.html', foreground: '569CD6' },
		{ token: 'metatag.xml', foreground: '569CD6' },
		{ token: 'metatag.php', fontStyle: 'bold' },

		{ token: 'key', foreground: '9CDCFE' },
		{ token: 'string.key', foreground: '9CDCFE' },
		{ token: 'string.value', foreground: 'CE9178' },

		{ token: 'attribute.name', foreground: '569CD6' },
		{ token: 'attribute.value', foreground: '3FF23F' },

		{ token: 'string', foreground: 'CE9178' },
		{ token: 'string.sql', foreground: 'FF0000' },

		{ token: 'keyword', foreground: '569CD6' },
		{ token: 'keyword.flow', foreground: 'C586C0' },

		{ token: 'operator.sql', foreground: '778899' },
		{ token: 'operator.swift', foreground: '909090' },
		{ token: 'predefined.sql', foreground: 'FF00FF' },
	],
	colors: {
		[editorBackground]: '#000000',
		[editorForeground]: '#FFFFFF',
		[editorIndentGuides]: '#FFFFFF',
	}
};
/* -------------------------------- End hc-black theme -------------------------------- */
```
