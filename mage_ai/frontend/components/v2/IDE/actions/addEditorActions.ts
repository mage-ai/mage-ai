import { ActionBuilderType } from './interfaces';

export default function addEditorActions(
  monaco: any,
  editor: any,
  editorActions: ActionBuilderType[],
) {
  (editorActions ?? [])?.forEach(builder => {
    editor && editor?.addAction?.(builder(monaco));
  });
}
