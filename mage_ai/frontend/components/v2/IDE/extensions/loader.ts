export default async function loadExtensionsAndModules() {
  // import '@codingame/monaco-vscode-json-default-extension';
  // import '@codingame/monaco-vscode-json-language-features-default-extension'';
  // import '@codingame/monaco-vscode-markdown-basics-default-extension';
  // import '@codingame/monaco-vscode-markdown-language-features-default-extension';
  // import '@codingame/monaco-vscode-markdown-math-default-extension'';
  // import '@codingame/monaco-vscode-r-default-extension'';
  // import '@codingame/monaco-vscode-sql-default-extension';
  // import '@codingame/monaco-vscode-typescript-basics-default-extension'';
  // import '@codingame/monaco-vscode-yaml-default-extension'';
  await import('@codingame/monaco-vscode-python-default-extension');
  const [
    { CloseAction, ErrorAction, MessageTransports },
    { MonacoEditorLanguageClientWrapper, UserConfig },
    { MonacoLanguageClient },
    { WebSocketMessageReader, WebSocketMessageWriter, toSocket },
    { useWorkerFactory },
  ] = await Promise.all([
    import('vscode-languageclient'),
    import('monaco-editor-wrapper'),
    import('monaco-languageclient'),
    import('vscode-ws-jsonrpc'),
    import('monaco-editor-wrapper/workerFactory'),
  ]);
  return {
    CloseAction,
    ErrorAction,
    MessageTransports,
    MonacoEditorLanguageClientWrapper,
    MonacoLanguageClient,
    UserConfig,
    WebSocketMessageReader,
    WebSocketMessageWriter,
    toSocket,
    useWorkerFactory,
  };
}
