export function testShortcut(monaco) {
  // Explanation:
  // Press F1 => the action will appear and run if it is enabled
  // Press Ctrl-F10 => the action will run if it is enabled
  // Press Chord Ctrl-K, Ctrl-M => the action will run if it is enabled

  return {
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    // An unique identifier of the contributed action.
    id: 'my-unique-id',
    // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
    keybindingContext: null,
    // An optional array of keybindings for the action.
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.F10,
      // chord
      monaco.KeyMod.chord(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM,
      ),
    ],
    // A label of the action that will be presented to the user.
    label: 'My Label!!!',
    // A precondition for this action.
    precondition: null,
    // Method that will be executed when the action is triggered.
    // @param editor The editor instance is passed in as a convenience
    run: function (ed) {
      alert('i’m running => ' + ed.getPosition());
    },
  };
}

export function saveCode(monaco, onSave) {
  return {
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    id: 'saveCode',
    keybindingContext: null,
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    ],
    label: 'Save',
    precondition: null,
    run: () => onSave(),
  };
}
