// pages/index.js
import React from 'react';
import dynamic from 'next/dynamic';
import { listen, MessageConnection } from 'vscode-ws-jsonrpc';
import { MonacoLanguageClient, CloseAction, ErrorAction } from 'monaco-languageclient';

const MonacoEditor = dynamic(import('monaco-editor-wrapper'), { ssr: false });

function createLanguageClient(connection) {
  return new MonacoLanguageClient({
    name: 'Sample Language Client',
    clientOptions: {
      documentSelector: ['json'],
      errorHandler: {
        error: () => ErrorAction.Continue,
        closed: () => CloseAction.DoNotRestart,
      },
    },
    connectionProvider: {
      get: (errorHandler, closeHandler) => Promise.resolve(createConnection(connection, errorHandler, closeHandler)),
    },
  });
}

function createConnection(connection, errorHandler, closeHandler) {
  return new MessageConnection(connection, errorHandler, closeHandler);
}

function createWebSocket(url) {
  const webSocket = new WebSocket(url);
  listen({
    webSocket,
    onConnection: (connection) => {
      const languageClient = createLanguageClient(connection);
      const disposable = languageClient.start();
      connection.onClose(() => disposable.dispose());
    },
  });
  return webSocket;
}

export default function Home() {
  const url = 'ws://localhost:8765';

  return (
    <div>
      <h1>Monaco Editor Example</h1>
      <MonacoEditor
        beforeMount={(monaco) => {
          const webSocket = createWebSocket(url);
          return () => webSocket.close();
        }}
        language="json"
        options={{
          automaticLayout: true,
        }}
        theme="vs-dark"
      />
    </div>
  );
}






// import React, { useEffect, useRef } from 'react';

// import { MonacoLanguageClient } from 'monaco-languageclient';
// import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from 'vscode-ws-jsonrpc';
// import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient';
// import { useWorkerFactory } from 'monaco-editor-wrapper/workerFactory';

// import { MonacoEditorLanguageClientWrapper, UserConfig } from 'monaco-editor-wrapper';

// // import {
// //   MonacoServices,
// //   createConnection,
// //   createMessageConnection,
// // } from 'monaco-languageclient';
// import ReconnectingWebSocket from 'reconnecting-websocket';
// import { listen } from 'vscode-ws-jsonrpc';
// import { wrapper } from 'monaco-editor-wrapper';

// const MonacoEditorWrapper = () => {
//   const editorRef = useRef(null);

//   useEffect(() => {
//     // Create the Monaco Editor
//     wrapper({
//       element: editorRef.current,
//       language: 'javascript',
//     }).then((editor) => {
//       // Install Monaco Services
//       MonacoServices.install(editor);

//       const url = 'ws://localhost:8765';
//       const webSocket = new ReconnectingWebSocket(url);

//       listen({
//         webSocket,
//         onConnection: (connection) => {
//           const languageClient = createLanguageClient(connection);
//           const disposable = languageClient.start();
//           connection.onClose(() => disposable.dispose());
//         },
//       });

//       // Function to create the language client
//       function createLanguageClient(connection) {
//         return new MonacoLanguageClient({
//           name: 'Sample Language Client',
//           clientOptions: {
//             documentSelector: ['javascript'],
//             errorHandler: {
//               error: () => ErrorAction.Continue,
//               closed: () => CloseAction.Restart,
//             },
//           },
//           connectionProvider: {
//             get: () => Promise.resolve(connection),
//           },
//         });
//       }
//     }).catch(console.error);
//   }, []);

//   return <div ref={editorRef} style={{ height: '100vh' }} />;
// };

// export default MonacoEditorWrapper;
