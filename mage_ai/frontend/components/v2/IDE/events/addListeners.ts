export type EventListeners = Record<string, (editor: any, event: any) => void>;

export function addListenersForDiff(editor: any, eventListeners: EventListeners) {
  // onDidChangeModel
  // onDidUpdateDiff

  Object.entries(eventListeners).forEach(([eventName, listener]) => {
    if (eventName in editor) {
      editor[eventName]((event: any) => listener(editor, event));
    }
  });
}

export function addListeners(editor: any, eventListeners: EventListeners) {
  // https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.ICodeEditor.html
  // onContextMenu
  // onDidAttemptReadOnlyEdit
  // onDidBlurEditorText
  // onDidBlurEditorWidget
  // onDidChangeConfiguration
  // onDidChangeCursorPosition
  // onDidChangeCursorSelection
  // onDidChangeHiddenAreas
  // onDidChangeModel
  // onDidChangeModelContent
  // onDidChangeModelDecorations
  // onDidChangeModelLanguage
  // onDidChangeModelLanguageConfiguration
  // onDidChangeModelOptions
  // onDidChangeModelTokens
  // onDidChangeViewZones
  // onDidCompositionEnd
  // onDidCompositionStart
  // onDidContentSizeChange
  // onDidDispose
  // onDidFocusEditorText
  // onDidFocusEditorWidget
  // onDidLayoutChange
  // onDidPaste
  // onDidScrollChange
  // onDidType
  // onDropIntoEditor
  // onKeyDown
  // onKeyUp
  // onMouseDown
  // onMouseDrag
  // onMouseDrop
  // onMouseDropCanceled
  // onMouseLeave
  // onMouseMove
  // onMouseUp
  // onMouseWheel
  // onWillChangeModel
  // onWillType

  Object.entries(eventListeners).forEach(([eventName, listener]) => {
    if (eventName in editor) {
      editor[eventName]((event: any) => listener(editor, event));
    }
  });
}
