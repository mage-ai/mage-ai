import { useRef } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';

import createLanguageClient, { ClientOptionsType } from './client';

type ConnectOptionsType = {
  monaco?: typeof import('monaco-editor');
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onOpen?: (event: Event, webSocket: ReconnectingWebSocket, languageClient: any) => void;
};

export type WebsocketOperationsType = {
  cleanup: () => void;
  connectWebsocket: (options?: ConnectOptionsType) => void;
  restartLanguageClient: () => void;
};

export default function useWebsocket(
  uuid: string,
  url: string,
  languageClientOptions?: ClientOptionsType,
): WebsocketOperationsType {
  const languageClientRef = useRef<any>(null);
  const webSocketRef = useRef<ReconnectingWebSocket>(null);

  function restartLanguageClient() {
    const languageClient = languageClientRef?.current;
    if (languageClient) {
      languageClient.stop();
      languageClient.start();
    }
  }

  function connect(options?: ConnectOptionsType) {
    const { monaco, onClose, onError, onOpen } = options || ({} as ConnectOptionsType);

    if (!webSocketRef?.current) {
      webSocketRef.current = new ReconnectingWebSocket(url, undefined, {
        connectionTimeout: 10000,
        debug: false,
        maxReconnectionDelay: 10000,
        maxRetries: Infinity,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
      });

      const webSocket = webSocketRef?.current;
      if (webSocket) {
        webSocket.onopen = async (event: Event) => {
          // createLanguageClient
          languageClientRef.current = await createLanguageClient(
            uuid,
            monaco,
            webSocket,
            languageClientOptions,
          );

          const languageClient = languageClientRef?.current;

          if (languageClient) {
            await languageClient?.start(); // Ensure the language client starts
            webSocket.onclose = () => languageClient?.stop();
          }

          if (onOpen) {
            onOpen?.(event, webSocket, languageClient);
          }
        };

        if (onClose) {
          webSocket.onclose = onClose;
        }

        webSocket.onerror = (error: ErrorEvent) => {
          console.error('WebSocket error', error);
          webSocket.close();

          if (onError) {
            onError?.(error);
          }
        };
      }
    }
  }

  function cleanup() {
    const languageClient = languageClientRef?.current;
    const webSocket = webSocketRef?.current;
    languageClient?.dispose();
    webSocket?.close();
  }

  return {
    cleanup,
    connectWebsocket: connect,
    restartLanguageClient,
  };
}
