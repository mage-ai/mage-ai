import { ActionBuilderType } from './interfaces';
import { commentLine } from './';

export default function addEditorActions(
  monaco: any,
  editor: any,
  editorActions: ActionBuilderType[],
) {
  (editorActions ?? [])
    .concat([
      // commentLine(),
    ])
    ?.forEach(builder => editor.addAction(builder(monaco)));
}
