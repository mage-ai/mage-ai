import { EditorAction } from './interfaces';

export function executeCode(handler: () => void): (monaco: any) => EditorAction {
  return (monaco: any) => ({
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    id: 'executeCode',
    keybindingContext: null,
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    ],
    label: 'Execude code',
    precondition: null,
    run: () => handler(),
  });
}
