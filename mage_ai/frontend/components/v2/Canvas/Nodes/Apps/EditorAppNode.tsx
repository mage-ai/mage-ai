import useEditorAppNode, { EditorAppNodeProps } from './useEditorAppNode';

function EditorAppNode(props: EditorAppNodeProps) {
  const { main, toolbars, wrapper } = useEditorAppNode(props);

  return wrapper({
    main,
    toolbars,
  });
}

export default EditorAppNode;
