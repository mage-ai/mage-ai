import { useMemo, useRef } from "react";
import useEditorAppNodeBase from "@components/v2/Canvas/Nodes/Apps/useEditorAppNode";
import Grid from "@mana/components/Grid";

export default function useEditorAppNode({
  app,
}) {
  const fileRef = useRef(app?.options?.file);
  const { main: mainBase, subheader, toolbars } = useEditorAppNodeBase({
    app,
    fileRef,
    skipInitialFetch: false,
  });

  const main = useMemo(() => (
    <Grid
      templateRows={subheader ? "auto 1fr" : "1fr"}
      templateColumns="1fr"
    >
      {subheader}
      {mainBase}
    </Grid>
  ), [mainBase, subheader]);

  const toolbarsTop = useMemo(() => toolbars?.top && (
    <Grid
      alignItems="center"
      justifyContent="end"
    >
      {toolbars?.top}
    </Grid>
  ), [toolbars?.top]);

  return {
    main,
    toolbars: {
      ...toolbars,
      top: toolbarsTop,
    },
  };
}
