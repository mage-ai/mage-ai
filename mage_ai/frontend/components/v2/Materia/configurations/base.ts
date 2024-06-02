export function base({
  height,
  fontFamily = 'Fira Code Retina, Fira Code Light',
  fontSize = 14,
  fontWeight,
  language,
  letterSpacing,
  lineHeight,
  lineNumbers,
  overflowWidgetsDomNode,
  padding,
  readOnly,
  readOnlyMessage,
  rulers,
  suggestFontSize,
  suggestLineHeight,
  theme,
  value,
  width,
  wordWrapColumn = 100,
}) {
  return {
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: 'smart',
    accessibilitySupport: 'off',
    // The aria label for the editor's textarea (when it is focused).
    ariaLabel: 'materia-focused',
    autoClosingBrackets: 'always',
    autoClosingComments: 'always',
    autoClosingQuotes: 'always',
    autoDetectHighContrast: false,
    autoIndent: 'advanced',
    // Enable that the editor will install a ResizeObserver to check if its
    // container dom node size has changed.
    automaticLayout: false,
    bracketPairColorization: {
      enabled: true,
      independentColorPoolPerBracketType: false,
    },
    codeActionsOnSaveTimeout: 750, // Timeout for running code actions on save.
    codeLens: true, // Code lens font family. Defaults to editor font family.
    codeLensFontFamily: 'inherit',
    codeLensFontSize: 14, // Code lens font size. Default to 90% of the editor font size
    colorDecorators: true,
    colorDecoratorsActivatedOn: 'hover',
    comments: {
      ignoreEmptyLines: true, // Ignore empty lines when inserting line comments.
      // Insert a space after the line comment token and inside the block comments tokens.
      insertSpace: true,
    },
    contextmenu: true, // Enable custom contextmenu. Defaults to true.
    copyWithSyntaxHighlighting: true,
    cursorBlinking: 'blink',
    cursorSmoothCaretAnimation: 'on',
    cursorStyle: 'block',
    cursorSurroundingLines: 0,
    // Controls when cursorSurroundingLines should be enforced
    cursorSurroundingLinesStyle: 'default',
    cursorWidth: 100, // Control the width of the cursor when cursorStyle is set to 'line'
    // Controls whether the definition link opens element in the peek widget.
    definitionLinkOpensInPeek: true,
    detectIndentation: true,
    dimension: {
      height,
      width,
    },
    // Disable the use of transform: translate3d(0px, 0px, 0px)
    // for the editor margin and lines layers.
    disableLayerHinting: false,
    dragAndDrop: false, // Controls if the editor should allow to move selections via drag and drop.
    // Controls dropping into the editor from an external source.
    // When enabled, this shows a preview of the drop location and triggers an onDropIntoEditor event.
    dropIntoEditor: true,
    emptySelectionClipboard: false, // Copying without a selection copies the current line.
    // FastScrolling mulitplier speed when pressing Alt Defaults to 5.
    fastScrollSensitivity: 5,
    // Configuration options for editor find widget
    find: {
      addExtraSpaceOnTop: true,
      autoFindInSelection: 'always',
      cursorMoveOnType: true,
      loop: true,
      seedSearchStringFromSelection: 'always',
    },
    fixedOverflowWidgets: true,
    folding: true,
    foldingHighlight: true,
    foldingImportsByDefault: true,
    foldingMaximumRegions: 5000,
    foldingStrategy: 'indentation',
    fontFamily,
    fontLigatures: true,
    fontSize,
    fontVariations: true,
    fontWeight,
    formatOnPaste: true,
    formatOnType: true,
    glyphMargin: true,
    gotoLocation: {
      multiple: 'peek',
      // This option sets an alternative command that will be executed when the
      // "Go to Definition" action is triggered with the Alt key:
      alternativeDefinitionCommand: 'editor.action.revealDefinitionAside',
      // This option sets an alternative command that will be executed when the
      // "Go to Declaration" action is triggered with the Alt key:
      alternativeDeclarationCommand: 'editor.action.peekDeclaration',
      // This option sets an alternative command that will be executed when the
      // "Go to Type Definition" action is triggered with the Alt key:
      alternativeTypeDefinitionCommand: 'editor.action.peekTypeDefinition',
      // This option sets an alternative command that will be executed when the
      // "Go to Implementation" action is triggered with the Alt key:
      alternativeImplementationCommand: 'editor.action.peekImplementation',
      // This option sets an alternative command that will be executed when the
      // "Go to References" action is triggered with the Alt key:
      alternativeReferenceCommand: 'editor.action.findReferences',
    },
    guides: {
      bracketPairs: true,
      bracketPairsHorizontal: true,
      highlightActiveIndentation: true,
      indentation: true,
    },
    hover: {
      above: true,
      delay: 300,
      enabled: true,
      hidingDelay: 500,
      sticky: true,
    },
    inlayHints: {
      enabled: 'on',
      fontFamily,
      fontSize,
      padding: true,
    },
    inlineSuggest: {
      enabled: true,
      fontFamily,
      keepOnBlur: true,
      // Use prefix to only show ghost text if the text to
      // replace is a prefix of the suggestion text.
      // Use subword to only show ghost text if the
      // replace text is a subword of the suggestion text.
      // Use subwordSmart to only show ghost text if the replace text is a subword of the suggestion
      // text, but the subword must start after the cursor position.
      mode: 'subwordSmart',
      showToolbar: 'always',
      suppressSuggestions: false,
    },
    insertSpaces: true,
    language,
    largeFileOptimizations: true,
    letterSpacing,
    lightbulb: {
      // Enable the lightbulb code action.
      // The three possible values are off, on and onCode and the default is onCode.
      // off disables the code action menu. on shows the code action menu on code and on empty lines.
      // onCode shows the code action menu on code only.
      enabled: 'on',
    },
    // The width reserved for line decorations (in px).
    // Line decorations are placed between line numbers and the editor content.
    // You can pass in a string in the format floating point followed by "ch". e.g. 1.3ch.
    lineDecorationsWidth: 10,
    lineHeight,
    lineNumbers,
    lineNumbersMinChars: 5,
    // With `linkedEditing` enabled, if you change the `<span>` tag's name,
    // the corresponding `</span>` tag will also update automatically.
    linkedEditing: true,
    links: true,
    matchBrackets: 'always',
    // Controls whether suggestions allow matches in the middle of the word
    // instead of only at the beginning.
    matchOnWordStartOnly: false,
    maxTokenizationLineLength: 20000,
    minimap: {
      autohide: false,
      enabled: true,
      maxColumn: 120,
      renderCharacters: true,
      scale: 1,
      sectionHeaderFontSize: 9,
      showMarkSectionHeaders: true,
      showRegionSectionHeaders: true,
      showSlider: 'mouseover',
      side: 'right',
      size: 'proportional',
    },
    // A lot of configurations
    // model
    mouseStyle: 'text', // Controls the cursor style, accepts either 'text' or 'default'.
    mouseWheelScrollSensitivity: 1,
    mouseWheelZoom: false,
    multiCursorLimit: 1000,
    multiCursorMergeOverlapping: true,
    multiCursorModifier: 'alt', // ctrlCmd
    multiCursorPaste: 'spread', // full
    // Enable semantic occurrences highlight.
    // 'off' disables occurrence highlighting
    // 'singleFile' triggers occurrence highlighting in the current document
    // 'multiFile' triggers occurrence highlighting across valid open documents
    occurrencesHighlight: 'multiFile',
    // Place overflow widgets inside an external DOM node. Defaults to an internal DOM node.
    overflowWidgetsDomNode,
    overviewRulerBorder: true, // Controls if a border should be drawn around the overview ruler.
    overviewRulerLanes: 3, // The number of vertical lanes the overview ruler should render.
    padding, // bottom, top
    parameterHints: {
      cycle: true,
      enabled: true,
    },
    pasteAs: {
      enable: true,
      showPasteSelector: 'afterPaste',
    },
    peekWidgetDefaultFocus: 'editor', // tree, false
    quickSuggestions: {
      comments: 'inline',
      other: 'inline',
      strings: 'inline',
    },
    quickSuggestionsDelay: 5,
    readOnly,
    readOnlyMessage,
    renderControlCharacters: true, // Controls whether the editor should render control characters
    renderFinalNewline: true,
    // - **'none'**: No line highlighting.
    // - **'gutter'**: Highlights the gutter where the line numbers are displayed.
    // - **'line'**: Highlights the entire line where the cursor is positioned.
    // - **'all'**: Highlights both the gutter and the entire line.
    renderLineHighlight: 'all',
    renderLineHighlightOnlyWhenFocus: false,
    renderValidationDecorations: 'on',
    renderWhitespace: 'all',
    revealHorizontalRightPadding: 30,
    roundedSelection: false,
    // { color, column }[]
    rulers,
    screenReaderAnnounceInlineSuggestion: false,
    scrollBeyondLastColumn: 3,
    scrollBeyondLastLine: true,
    scrollPredominantAxis: true,
    scrollbar: {
      alwaysConsumeMouseWheel: true,
      arrowSize: 12,
      handleMouseWheel: true,
      horizontal: 'auto',
      horizontalHasArrows: false,
      horizontalScrollbarSize: 10,
      horizontalSliderSize: 5,
      ignoreHorizontalScrollbarInContentHeight: true,
      scrollByPage: true,
      useShadows: false,
      vertical: 'auto',
      verticalHasArrows: false,
      verticalScrollbarSize: 10,
      verticalSliderSize: 5,
    },
    selectOnLineNumbers: true,
    selectionClipboard: true,
    selectionHighlight: true,
    'semanticHighlighting.enabled': true,
    showDeprecated: true,
    showFoldingControls: 'always',
    showUnused: true,
    smartSelect: {
      selectLeadingAndTrailingWhitespace: true,
      selectSubwords: true,
    },
    smoothScrolling: false,
    snippetSuggestions: 'inline', // top, bottom, inline, none
    stablePeek: false,
    stickyScroll: {
      defaultModel: 'outlineModel',
      enabled: true,
      maxLineCount: 100,
      scrollWithEditor: false,
    },
    stickyTabStops: true,
    stopRenderingLineAfter: 10000,
    suggest: {
      filterGraceful: true,
      insertMode: 'insert',
      localityBonus: true,
      matchOnWordStartOnly: false,
      preview: true,
      previewMode: 'subwordSmart',
      selectionMode: 'always',  // "never" | "whenTriggerCharacter" | "whenQuickSuggestion"
      shareSuggestSelections: true,
      showClasses: true,
      showColors: true,
      showConstants: true,
      showConstructors: true,
      showDeprecated: true,
      showEnumMembers: true,
      showEnums: true,
      showEvents: true,
      showFields: true,
      showFiles: true,
      showFolders: true,
      showFunctions: true,
      showIcons: true,
      showInlineDetails: true,
      showInterfaces: true,
      showIssues: true,
      showKeywords: true,
      showMethods: true,
      showModules: true,
      showOperators: true,
      showProperties: true,
      showReferences: true,
      showSnippets: true,
      showStatusBar: true,
      showStructs: true,
      showTypeParameters: true,
      showUnits: true,
      showUsers: true,
      showValues: true,
      showVariables: true,
      showWords: true,
      snippetsPreventQuickSuggestions: true,
    },
    suggestFontSize,
    suggestLineHeight,
    suggestOnTriggerCharacters: true,
    // `first: Always select the first suggestion in the list.
    // `recentlyUsed: Select the most recently used suggestion from the list.
    // `recentlyUsedByPrefix: Select the most recently used suggestion that matches the current prefix.
    suggestSelection: 'recentlyUsedByPrefix',
    tabCompletion: 'on',
    tabFocusMode: true,
    tabIndex: 0,
    tabSize: 4,
    theme,
    trimAutoWhitespace: true,
    unfoldOnClickAfterEndOfLine: false,
    unicodeHighlight: true,
    unusualLineTerminators: 'prompt',
    useShadowDOM: true,
    useTabStops: true,
    value,
    wordBasedSuggestions: 'currentDocument', // matchingDocuments, allDocuments
    wordBasedSuggestionsOnlySameLanguage: true,
    wordBreak: 'normal',
    wordWrap: 'wordWrapColumn', // "off" | "on" | "wordWrapColumn" | "bounded"
    wordWrapColumn,
    wrappingIndent: 'deepIndent', // "none" | "same" | "indent" | "deepIndent"
    wrappingStrategy: 'advanced', // "simple" | "advanced"
  };
}
