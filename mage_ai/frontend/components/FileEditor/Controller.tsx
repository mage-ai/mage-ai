import ApiReloader from '@components/ApiReloader';
import FileEditor from '@components/FileEditor';

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
  return (
    <>
      {openFilePaths?.map((filePath: string) => (
        <div
          key={filePath}
          style={{
            display: selectedFilePath === filePath
              ? null
              : 'none',
          }}
        >
          <ApiReloader uuid={`FileEditor/${decodeURIComponent(filePath)}`}>
            <FileEditor
              {...props}
              active={selectedFilePath === filePath}
              addNewBlock={addNewBlock}
              contained={contained}
              containerRef={containerRef}
              disableRefreshWarning={disableRefreshWarning}
              fetchPipeline={fetchPipeline}
              fetchVariables={fetchVariables}
              filePath={filePath ? encodeURIComponent(filePath) : null}
              codeEditorMaximumHeightOffset={codeEditorMaximumHeightOffset}
              hideHeaderButtons
              onContentChange={(content: string) => setContentByFilePath({
                [filePath]: content,
              })}
              onUpdateFileSuccess={onUpdateFileSuccess}
              openSidekickView={openSidekickView}
              originalContent={originalContent}
              pipeline={pipeline}
              sendTerminalMessage={sendTerminalMessage}
              setDisableShortcuts={setDisableShortcuts}
              setSelectedBlock={setSelectedBlock}
              saveFile={saveFile}
              selectedFilePath={selectedFilePath}
              setErrors={setErrors}
              setFilesTouched={setFilesTouched}
            />
          </ApiReloader>
        </div>
      ))}
    </>
  );
}

export default Controller;
