// monaco.KeyCode docs
// https://microsoft.github.io/monaco-editor/api/enums/monaco.KeyCode.html

export function saveCode(monaco, onSave) {
  return {
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    // An unique identifier of the contributed action.
    id: 'saveCode',
    // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
    keybindingContext: null,
    // An optional array of keybindings for the action.
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    ],
    // A label of the action that will be presented to the user.
    label: 'Save',
    // A precondition for this action.
    precondition: null,
    // Method that will be executed when the action is triggered.
    // @param editor The editor instance is passed in as a convenience
    run: (editor) => {
      // editor.getPosition()
      onSave();
    },
  };
}

export function executeCode(monaco, runBlock) {
  return {
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    id: 'executeCode',
    keybindingContext: null,
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    ],
    label: 'Run selected block',
    precondition: null,
    run: () => runBlock(),
  };
}
