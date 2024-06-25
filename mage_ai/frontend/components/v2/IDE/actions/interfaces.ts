export type ActionBuilderType = (monaco: any) => EditorAction;

export interface EditorAction {
  contextMenuGroupId: string;
  contextMenuOrder: number;
  id: string;
  keybindings: any[];
  label: string;
  run: (editor: any) => void;
}
