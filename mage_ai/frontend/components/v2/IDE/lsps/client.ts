import ReconnectingWebSocket from 'reconnecting-websocket';
let MonacoLanguageClient: any = null;

async function initializeMonacoLanguageClient() {
  try {
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module = await import('monaco-languageclient');
    console.log('monaco-languageclient module:', module);

    MonacoLanguageClient = module.MonacoLanguageClient || module.default?.MonacoLanguageClient;

    if (MonacoLanguageClient) {
      console.log('Resolved MonacoLanguageClient:', MonacoLanguageClient);
    } else {
      throw new Error("MonacoLanguageClient is missing from 'monaco-languageclient' module.");
    }
  } catch (error) {
    console.error('Failed to import monaco-languageclient:', error);
  }
}

export type ClientOptionsType = {
  documentSelector?: any;
  synchronize?: any;
  diagnosticCollectionName?: any;
  outputChannel?: any;
  outputChannelName?: any;
  initializationOptions?: any;
  initializationFailedHandler?: any;
  errorHandler?: any;
  workspaceFolder?: any;
};

export default async function createLanguageClient(
  uuid: string,
  monaco: typeof import('monaco-editor'),
  webSocket: ReconnectingWebSocket,
  clientOptions?: ClientOptionsType,
): Promise<any> {
  await initializeMonacoLanguageClient();

  const { documentSelector } = clientOptions || ({} as ClientOptionsType);

  if (monaco && MonacoLanguageClient && MonacoLanguageClient.MessagingService) {
    MonacoLanguageClient.MessagingService.install(monaco);
  }

  return new MonacoLanguageClient({
    clientOptions: {
      documentSelector: documentSelector || [
        {
          language: 'python',
        },
      ],
      errorHandler: {
        closed: () => {
          console.warn('Language Client Closed');
          return 1; // Assuming 1 is the equivalent for CloseAction.Restart
        },
        error: (error, message, count) => {
          console.error('Language Client Error:', error, message);
          if (count < 5) {
            return 1; // Assuming 1 is the equivalent for ErrorAction.Continue
          }
          return 2; // Assuming 2 is the equivalent for ErrorAction.Shutdown
        },
      },
    },
    connectionProvider: {
      get: () =>
        Promise.resolve({
          reader: new MonacoLanguageClient.MessageReader(webSocket),
          writer: new MonacoLanguageClient.MessageWriter(webSocket),
        }),
    },
    name: uuid,
  });
}
