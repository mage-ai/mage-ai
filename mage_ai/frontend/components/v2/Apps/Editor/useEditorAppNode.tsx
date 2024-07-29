import { useRef } from "react";
import useEditorAppNodeBase from "@components/v2/Canvas/Nodes/Apps/useEditorAppNode";

export default function useEditorAppNode({
  app,
}) {
  const fileRef = useRef(app?.options?.file);
  const { main, toolbars } = useEditorAppNodeBase({
    app,
    fileRef,
  });

  return {
    main,
    toolbars,
  };
}
