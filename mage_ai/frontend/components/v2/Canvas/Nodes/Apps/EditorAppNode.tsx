import useEditorAppNode, { EditorAppNodeProps } from './useEditorAppNode';

export const DEFAULT_RECT = {
  height: 500,
  width: 600,
}

function EditorAppNode(props: EditorAppNodeProps) {
  const { main, subheader, toolbars, wrapper } = useEditorAppNode(props);

  return wrapper({
    main,
    subheader,
    toolbars,
  });
}

export default EditorAppNode;
