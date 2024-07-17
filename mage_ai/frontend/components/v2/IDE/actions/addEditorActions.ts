import { EditorAction, ActionBuilderType } from './interfaces';
// monaco.KeyCode docs
// https://microsoft.github.io/monaco-editor/api/enums/monaco.KeyCode.html
//
// id: A unique identifier for the action.
// label: The label of the action, this will be displayed in the context menu.
// contextMenuOrder: The order in which the action should be displayed in the context menu, if you want to show this at the top set it to 0.
// contextMenuGroupId: The group id of the action, set to 1_modification there are three options for this group id.
// navigation - The navigation group comes first in all cases.
// keybindings: The keybindings to trigger the action, set to [CtrlCmd + Enter].
// run: A function to be called when the action is triggered.

// const executeAction: monaco.editor.IActionDescriptor = {
//     id: "run-code",
//     label: "Run Code",
//     contextMenuOrder: 2,
//     contextMenuGroupId: "1_modification",
//     keybindings: [
//         KeyMod.CtrlCmd | KeyCode.Enter,
//     ],
//     run: runTinker,
// }

export default function addEditorActions(monaco: any, editor: any, editorActions: ActionBuilderType[]) {
  console.log(editorActions);
  editorActions?.forEach(builder => editor.addAction(builder(monaco)));
}
