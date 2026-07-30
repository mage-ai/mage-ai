import { useEffect, useState } from 'react';

import { OverlayStyle } from './index.style';

function Controller({
  addNewBlock,
  contained,
  containerRef,
  disableRefreshWarning,
  fetchPipeline,
  fetchVariables,
  codeEditorMaximumHeightOffset,
  onUpdateFileSuccess,
  openFilePaths,
  openSidekickView,
  originalContent,
  pipeline,
  saveFile,
  selectedFilePath,
  sendTerminalMessage,
  setContentByFilePath,
  setDisableShortcuts,
  setErrors,
  setFilesTouched,
  setSelectedBlock,
  ...props
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) {
      setReady(true);
    }
  }, []);

  return (
    <>
      <OverlayStyle ready={ready} />

      {/* Replace all the file editor logic with iframe */}
      <iframe
        src='http://localhost:8080'
        style={{
          width: '100%',
          height: codeEditorMaximumHeightOffset
            ? `calc(100vh - ${codeEditorMaximumHeightOffset}px)`
            : '100vh',
          border: 'none',
          backgroundColor: 'transparent',
        }}
        title='Code Server'
        allow='clipboard-read; clipboard-write'
      />
    </>
  );
}

export default Controller;
