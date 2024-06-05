import '@codingame/monaco-vscode-python-default-extension';
import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient';
import { MonacoEditorLanguageClientWrapper, UserConfig } from 'monaco-editor-wrapper';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from 'vscode-ws-jsonrpc';
import { useWorkerFactory } from 'monaco-editor-wrapper/workerFactory';

export default async function EditorWrapper() {
  // const wrapper = new MonacoEditorLanguageClientWrapper();
  // const userConfig = {
  //   wrapperConfig: {
  //     editorAppConfig: {
  //       $type: 'extendend',
  //       languageId: 'python',
  //       code: 'print("Hello, World!")',
  //     },
  //   },
  // };

  // if (typeof window !== 'undefined') {
  //   const htmlElement = document.getElementById('monaco-editor-root');
  //   if (htmlElement) {
  //     try {
  //       await wrapper.initAndStart(userConfig, htmlElement);
  //       console.log('Monaco Editor initialized successfully');
  //     } catch (error) {
  //       console.error('Error initializing Monaco Editor:', error);
  //     }
  //   } else {
  //     console.error('Monaco editor HTML element not found');
  //   }
  // } else {
  //   console.error('Window is undefined');
  // }

  return (
    <div>
      <div id='monaco-editor-root'></div>
    </div>
  );
}
