// https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.ICodeEditor.html
export default function addListeners(editor) {
  editor.onContextMenu(args => {
    console.log('context menu event:', args);
  });
}
