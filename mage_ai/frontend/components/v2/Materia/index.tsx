import { useEffect, useRef } from 'react';
import { useMonaco, loader } from '@monaco-editor/react';

import { getHost } from '@api/utils/url';
import { useMemo } from 'react';

/*
 * In order to load the Monaco Editor locally and avoid fetching it from a CDN
 * (the default CDN is https://cdn.jsdelivr.net), the monaco-editor bundle was
 * copied into the "public" folder from node_modules, and we called the
 * loader.config method below to reference it.
 *
 * We can also use this method to load the Monaco Editor from a different
 * CDN like Cloudflare.
 */
loader.config({
  paths: {
    // Load Monaco Editor from "public" directory
    vs: `${getHost()}/monaco-editor/min/vs`,
    // Load Monaco Editor from different CDN
    // vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs',
  },
});

type IDEProps = {
  uuid: string;
};

function MateriaIDE({
  uuid,
}: IDEProps) {
  const editorContainerID = useMemo(() => `editor-container-${uuid}`, [uuid]);
  const editorRef = useRef(null);
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      editorRef.current = monaco.editor.create(
        document.getElementById(editorContainerID),
        base(),
      );
    }
  }, [editorContainerID, monaco]);

  return (
    <>
      <div id={editorContainerID} style={{ height: '500px' }} />;
    </>
  );
}

export default MateriaIDE;
