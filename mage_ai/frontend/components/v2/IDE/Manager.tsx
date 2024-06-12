import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef } from 'react';

import baseConfigurations from './configurations/base';
import initializeAutocomplete from './autocomplete';
import themes from './themes';
import { IDEThemeEnum } from './themes/interfaces';
import pythonProvider from './languages/python/provider';
import { FileType } from './interfaces';
import pythonConfiguration, { pythonLanguageExtension } from './languages/python/configuration';
import { ContainerStyled, IDEStyled } from './index.style';
import { LanguageEnum } from './languages/constants';
import { getHost } from '@api/utils/url';
import { languageClientConfig, loggerConfig } from './constants';

class Manager {
  private static instance: Manager;
  private monaco: any = null;
  private wrapper: any | null = null;

  private constructor() {
    // Private constructor to prevent direct class initialization
  }

  public static getInstance(): Manager {
    if (!Manager.instance) {
      Manager.instance = new Manager();
    }
    return Manager.instance;
  }

  getMonaco() {
    return this.monaco;
  }

  public async getWrapper(opts?: { codeResources: any; configurations: any }) {
    if (!this.wrapper) {
      const { codeResources, configurations } = opts || {};

      this.monaco = await import('monaco-editor');
      const configUri = new URL('./languages/python/config.json', import.meta.url).href;

      const pythonLanguageExtensionWithURI = {
        ...pythonLanguageExtension,
        configuration: this.monaco.Uri.parse(
          `${getHost({
            forceCurrentPort: true,
          })}${configUri}`,
        ),
      };
      this.monaco.languages.register(pythonLanguageExtensionWithURI);
      this.monaco.languages.setLanguageConfiguration(
        pythonLanguageExtension.id,
        // @ts-ignore
        pythonConfiguration(),
      );
      initializeAutocomplete(this.monaco);

      const { MonacoEditorLanguageClientWrapper } = await import('monaco-editor-wrapper');
      const { useWorkerFactory } = await import('monaco-editor-wrapper/workerFactory');
      await import('@codingame/monaco-vscode-python-default-extension');

      const configureMonacoWorkers = () => {
        useWorkerFactory({
          ignoreMapping: true,
          workerLoaders: {
            editorWorkerService: () =>
              new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), {
                type: 'module',
              }),
            javascript: () =>
              // @ts-ignore
              import('monaco-editor-wrapper/workers/module/ts').then(
                module => new Worker(module.default, { type: 'module' }),
              ),
          },
        });
      };

      configureMonacoWorkers();

      const userConfig = {
        languageClientConfig,
        loggerConfig,
        wrapperConfig: {
          editorAppConfig: {
            $type: 'classic' as const,
            codeResources: codeResources
              ? {
                  main: {
                    ...codeResources?.main,
                    uri:
                      typeof codeResources?.main?.uri === 'string'
                        ? this.monaco.Uri.parse(codeResources?.main?.uri)
                        : codeResources?.main?.uri,
                  },
                }
              : undefined,
            domReadOnly: true,
            editorOptions: configurations,
            languageDef: {
              languageExtensionConfig: pythonLanguageExtensionWithURI,
              monarchLanguage: pythonProvider(),
              theme: {
                data: themes[IDEThemeEnum.BASE],
                name: IDEThemeEnum.BASE,
              },
            },
            useDiffEditor: false,
          },
        },
      };

      // webSocket.onopen = () => {
      //     languageClient.start();
      //     // Notify LSP server about opened files
      //     monaco.editor.getModels().forEach(model => {
      //         languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
      //             model.uri.toString(),
      //             model.getLanguageId(),
      //             1,
      //             model.getValue()
      //         ));
      //     });

      //     webSocket.onclose = () => languageClient.stop();
      // };

      // Monitor editor for changes and notify the LSP server
      // editor.onDidChangeModelContent(event => {
      //     const model = editor.getModel();
      //     languageClient.sendNotification('textDocument/didChange', {
      //         textDocument: {
      //             uri: model.uri.toString(),
      //             version: model.getVersionId()
      //         },
      //         contentChanges: [{ text: model.getValue() }]
      //     });
      // });

      // editor.onDidChangeModel(event => {
      //     const model = event.newModel;
      //     if (model) {
      //         languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
      //             model.uri.toString(),
      //             model.getLanguageId(),
      //             1,
      //             model.getValue()
      //         ));
      //     }
      // });

      // monaco.editor.onDidCreateModel(model => {
      //     languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
      //         model.uri.toString(),
      //         model.getLanguageId(),
      //         1,
      //         model.getValue()
      //     ));
      // });

      // monaco.editor.onWillDisposeModel(model => {
      //     languageClient.sendNotification('textDocument/didClose', {
      //         textDocument: { uri: model.uri.toString() }
      //     });
      // });

      try {
        this.wrapper = new MonacoEditorLanguageClientWrapper();
        await this.wrapper.init(userConfig);
      } catch (error) {
        console.error('[ERROR] IDE: error while initializing Monaco editor:', error);
      } finally {
      }
    }

    return this.wrapper;
  }
}

export { Manager };

export default Manager;

// webSocket.onopen = () => {
//     languageClient.start();
//     // Notify LSP server about opened files
//     monaco.editor.getModels().forEach(model => {
//         languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
//             model.uri.toString(),
//             model.getLanguageId(),
//             1,
//             model.getValue()
//         ));
//     });

//     webSocket.onclose = () => languageClient.stop();
// };

// Monitor editor for changes and notify the LSP server
// editor.onDidChangeModelContent(event => {
//     const model = editor.getModel();
//     languageClient.sendNotification('textDocument/didChange', {
//         textDocument: {
//             uri: model.uri.toString(),
//             version: model.getVersionId()
//         },
//         contentChanges: [{ text: model.getValue() }]
//     });
// });

// editor.onDidChangeModel(event => {
//     const model = event.newModel;
//     if (model) {
//         languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
//             model.uri.toString(),
//             model.getLanguageId(),
//             1,
//             model.getValue()
//         ));
//     }
// });

// monaco.editor.onDidCreateModel(model => {
//     languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
//         model.uri.toString(),
//         model.getLanguageId(),
//         1,
//         model.getValue()
//     ));
// });

// monaco.editor.onWillDisposeModel(model => {
//     languageClient.sendNotification('textDocument/didClose', {
//         textDocument: { uri: model.uri.toString() }
//     });
// });
