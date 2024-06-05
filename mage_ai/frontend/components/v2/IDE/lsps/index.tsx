export default function lsps() {
  return null;
}

// import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from 'vscode-ws-jsonrpc';
// import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient';
// import { MonacoLanguageClient } from 'monaco-languageclient';
// // import { initServices } from 'monaco-languageclient/vscode/services';

// const createLanguageClient = (
//   uuid: string,
//   transports: MessageTransports,
//   language?: string,
// ): MonacoLanguageClient => {
//   if (!transports) {
//       throw new Error('transports is undefined');
//   }
//   if (!uuid) {
//       throw new Error('uuid is undefined');
//   }

//   return new MonacoLanguageClient({
//     clientOptions: {
//       // use a language id as a document selector
//       documentSelector: [language || 'python'],
//       // disable the default error handler
//       errorHandler: {
//         closed: () => ({ action: CloseAction.DoNotRestart }),
//         error: () => ({ action: ErrorAction.Continue }),
//       },
//     },
//     // create a language client connection from the JSON RPC connection on demand
//     connectionProvider: {
//       get: () => Promise.resolve(transports),
//     },
//     name: uuid,
//   });
// };

// export async function installServices() {
//   // await initServices({
//   //   serviceConfig: {
//   //     debugLogging: true,
//   //     userServices: {
//   //       codeActionProvider: true,
//   //       codeLensProvider: true,
//   //       completionItemProvider: true,
//   //       definitionProvider: true,
//   //       diagnosticsService: true,
//   //       documentFormattingProvider: true,
//   //       documentHighlightProvider: true,
//   //       documentRangeFormattingProvider: true,
//   //       documentSymbolProvider: true,
//   //       foldingRangeProvider: true,
//   //       hoverProvider: true,
//   //       implementationProvider: true,
//   //       referenceProvider: true,
//   //       renameProvider: true,
//   //       signatureHelpProvider: true,
//   //       typeDefinitionProvider: true,
//   //       workspaceSymbolProvider: true,
//   //     },
//   //   },
//   // });
// }

// /** parameterized version , support all languageId */
// export const initWebSocketAndStartClient = (
//   uuid: string,
//   url: string,
//   language?: string,
// ): WebSocket => {
//   const webSocket = new WebSocket(url);

//   webSocket.onopen = () => {
//     const socket = toSocket(webSocket);
//     const reader = new WebSocketMessageReader(socket);
//     const writer = new WebSocketMessageWriter(socket);
//     const languageClient = createLanguageClient(
//       uuid,
//       {
//         reader,
//         writer,
//       },
//       language,
//     );

//     languageClient.start();
//     reader.onClose(() => languageClient.stop());
//   };

//   return webSocket;
// };
