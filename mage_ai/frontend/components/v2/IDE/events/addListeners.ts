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
  // onDidChangeModelContent

  Object.entries(eventListeners).forEach(([eventName, listener]) => {
    if (eventName in editor) {
      editor[eventName]((event: any) => listener(editor, event));
    }
  });
}
