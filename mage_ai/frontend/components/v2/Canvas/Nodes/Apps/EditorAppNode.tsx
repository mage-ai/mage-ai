import useEditorAppNode, { EditorAppNodeProps } from './useEditorAppNode';

function EditorAppNode(props: EditorAppNodeProps) {
  const { main, subheader, toolbars, wrapper } = useEditorAppNode(props);

  return wrapper({
    main,
    subheader,
    toolbars,
  });
}

export default EditorAppNode;
