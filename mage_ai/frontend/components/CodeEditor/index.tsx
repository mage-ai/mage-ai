import * as ReactDOM from 'react-dom';
import Editor, { DiffEditor, loader } from '@monaco-editor/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHost } from '@api/utils/url';

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

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Text from '@oracle/elements/Text';
import usePrevious from '@utils/usePrevious';
import { DEFAULT_AUTO_SAVE_INTERVAL, DEFAULT_LANGUAGE, DEFAULT_THEME } from './constants';
import { DEBUG } from '@utils/environment';
import { DisableGlobalKeyboardShortcuts } from '@context/Keyboard';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR_FONT_SIZE as DEFAULT_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { ContainerStyle, PlaceholderStyle, SINGLE_LINE_HEIGHT } from './index.style';
import { ProvidersType } from './autocomplete/constants';
import { addAutocompleteSuggestions } from './autocomplete/utils';
import { addKeyboardShortcut } from './keyboard_shortcuts';
import { calculateHeightFromContent } from './utils';
import { defineTheme } from './utils';
import { saveCode } from './keyboard_shortcuts/shortcuts';

export type OnDidChangeCursorPositionParameterType = {
  editor: any;
  editorRect: {
    height?: number;
    top: number;
  };
  position: {
    lineNumber?: number;
    lineNumberTop: number;
  };
};

export type CodeEditorSharedProps = {
  height?: number | string;
  onDidChangeCursorPosition?: (opts: OnDidChangeCursorPositionParameterType) => void;
  selected?: boolean;
  setSelected?: (value: boolean) => void;
  setTextareaFocused?: (value: boolean) => void;
  textareaFocused?: boolean;
} & DisableGlobalKeyboardShortcuts;

type CodeEditorProps = {
  autocompleteProviders?: ProvidersType;
  autoHeight?: boolean;
  autoSave?: boolean;
  block?: BlockType;
  containerWidth?: number | string;
  editorRef?: any;
  fontSize?: number;
  language?: string;
  minimap?: boolean;
  onChange?: (value: string) => void;
  onContentSizeChangeCallback?: () => void;
  onMountCallback?: (editor?: any, monaco?: any) => void;
  onSave?: (value: string) => void;
  originalValue?: string;
  padding?: number;
  placeholder?: string;
  readOnly?: boolean;
  shortcuts?: ((monaco: any, editor: any) => void)[];
  showDiffs?: boolean;
  showLineNumbers?: boolean;
  tabSize?: number;
  theme?: any;
  uuid?: string;
  value?: string;
  width?: number | string;
} & CodeEditorSharedProps;

function CodeEditor(
  {
    autoHeight,
    autoSave,
    autocompleteProviders,
    block,
    containerWidth,
    editorRef: editorRefProp,
    fontSize = DEFAULT_FONT_SIZE,
    height,
    language,
    minimap,
    onChange,
    onContentSizeChangeCallback,
    onDidChangeCursorPosition,
    onMountCallback,
    onSave,
    originalValue,
    padding,
    placeholder,
    readOnly,
    selected,
    setDisableGlobalKeyboardShortcuts,
    setSelected,
    setTextareaFocused,
    shortcuts: shortcutsProp,
    showDiffs,
    showLineNumbers = true,
    tabSize = 4,
    textareaFocused,
    theme = DEFAULT_THEME,
    uuid,
    value,
    width = '100%',
  }: CodeEditorProps,
  ref,
) {
  const editorRef = editorRefProp || useRef(null);
  const monacoRef = useRef(null);
  const refBottomOfEditor = useRef(null);
  const timeoutRef = useRef(null);

  const [completionDisposable, setCompletionDisposable] = useState([]);
  const [monacoInstance, setMonacoInstance] = useState(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [loadedTheme, setLoadedTheme] = useState<string>(null);

  const updateTheme = useCallback(
    monaco => {
      setLoadedTheme(prevTheme => {
        if (prevTheme !== theme) {
          defineTheme(theme).then(loaded => {
            if (loaded) {
              monaco.editor.setTheme(theme);
              return theme;
            }
          });
        }

        return prevTheme;
      });
    },
    [theme],
  );

  const handleEditorWillMount = useCallback(
    monaco => {
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
      setMonacoInstance(monaco);
      updateTheme(monaco);
    },
    [updateTheme],
  );

  const handleEditorDidMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Initialize LSP WebSocket connection for Python
      if (language === 'python' && !showDiffs) {
        initializePythonLSP(editor, monaco);
      }

      const shortcuts = [];

      shortcutsProp?.forEach(func => {
        shortcuts.push(func(monaco, editor));
      });

      // Keyboard shortcuts for saving content: Command + S
      if (onSave) {
        shortcuts.push(
          saveCode(monaco, () => {
            onSave(editor.getValue());
          }),
        );
      }

      addKeyboardShortcut(monaco, editor, shortcuts);

      !showDiffs &&
        editor.getModel().updateOptions({
          tabSize,
        });

      if (autoHeight && !height) {
        editor._domElement.style.height = `${calculateHeightFromContent(value || '')}px`;
      }

      !showDiffs &&
        editor.onDidFocusEditorWidget(() => {
          /*
           * Added onClick handler for selecting block in CodeContainerStyle component.
           * Disabled the setSelected call below because if a user updates the block name
           * or color from the Block Settings in the Sidekick, clicking on the code editor
           * specifically uses an outdated block as the "selectedBlock" due to scoping issues
           * when mounting the code editor here.
           */
          // setSelected?.(true);
          // DEBUG(() => console.log('onDidFocusEditorWidget', uuid));

          if (setDisableGlobalKeyboardShortcuts) {
            setDisableGlobalKeyboardShortcuts?.(true);
          }
          setTextareaFocused?.(true);
        });

      !showDiffs &&
        editor.onDidBlurEditorText(() => {
          // DEBUG(() => console.log('onDidBlurEditorText', uuid));

          if (setDisableGlobalKeyboardShortcuts) {
            setDisableGlobalKeyboardShortcuts?.(false);
          }
        });

      !showDiffs &&
        editor.onDidContentSizeChange(({ contentHeight, contentHeightChanged }) => {
          if (autoHeight && contentHeightChanged) {
            editor._domElement.style.height = `${contentHeight + SINGLE_LINE_HEIGHT * 2}px`;
          }

          if (onContentSizeChangeCallback) {
            onContentSizeChangeCallback?.();
          }
        });

      if (selected && textareaFocused) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          editor.focus();
        }, 1);
      }

      if (!showDiffs && onDidChangeCursorPosition) {
        editor?.onDidChangeCursorPosition(({ position: { lineNumber } }) => {
          const { height, top } = editor._domElement.getBoundingClientRect();
          const lineNumberTop = editor.getTopForLineNumber(lineNumber);

          onDidChangeCursorPosition?.({
            editor,
            editorRect: {
              height: Number(height),
              top: Number(top),
            },
            position: {
              lineNumber,
              lineNumberTop,
            },
          });
        });
      }

      setMounted(true);
      onMountCallback?.(editor, monaco);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps,
    [
      setDisableGlobalKeyboardShortcuts,
      autoHeight,
      height,
      language, // Add language to dependencies
      onContentSizeChangeCallback,
      onDidChangeCursorPosition,
      onMountCallback,
      onSave,
      selected,
      setMounted,
      setTextareaFocused,
      shortcutsProp,
      showDiffs,
      tabSize,
      textareaFocused,
      value,
    ],
  );

  /**
   * Initializes the Python Language Server Protocol (LSP) integration via WebSocket.
   *
   * This function establishes a WebSocket connection to an LSP bridge running on localhost:3030,
   * implements the LSP protocol for communication with a Python language server, and registers
   * Monaco Editor providers for code completion, hover information, signature help, and diagnostics.
   *
   * Features provided:
   * - Real-time code completion with snippets and documentation
   * - Hover information for symbols and functions
   * - Signature help for function parameters
   * - Real-time error/warning diagnostics
   * - Full LSP protocol compliance
   *
   * @param editor - Monaco Editor instance
   * @param monaco - Monaco Editor API instance
   */
  const initializePythonLSP = useCallback((editor, monaco) => {
    try {
      /**
       * Creates a language client wrapper that implements the LSP protocol over WebSocket.
       * This wrapper mimics the vscode-languageclient API for compatibility.
       *
       * @returns Object containing the language client and WebSocket instance
       */
      const createLanguageClient = () => {
        const websocket = new WebSocket('ws://localhost:3030/');
        let requestId = 1;
        const pendingRequests = new Map();

        // Store notification handlers outside the WebSocket instance
        const notificationHandlers = new Map();

        /**
         * Language client that implements the LSP protocol.
         * Provides methods for sending requests/notifications and handling responses.
         */
        const languageClient = {
          /**
           * Sends an LSP request and returns a Promise with the response.
           * Implements proper request/response correlation using unique IDs.
           *
           * @param method - LSP method name (e.g., 'textDocument/completion')
           * @param params - Request parameters
           * @returns Promise that resolves with the LSP response
           */
          sendRequest: async (method, params) => {
            return new Promise((resolve, reject) => {
              const id = requestId++;
              pendingRequests.set(id, { resolve, reject });

              if (websocket.readyState === WebSocket.OPEN) {
                websocket.send(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    method,
                    params,
                  }),
                );

                // Timeout after 10 seconds to prevent hanging requests
                setTimeout(() => {
                  if (pendingRequests.has(id)) {
                    pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                  }
                }, 10000);
              } else {
                pendingRequests.delete(id);
                reject(new Error('WebSocket not connected'));
              }
            });
          },

          /**
           * Sends an LSP notification (fire-and-forget, no response expected).
           * Used for events like document changes, cursor movements, etc.
           *
           * @param method - LSP method name (e.g., 'textDocument/didChange')
           * @param params - Notification parameters
           */
          sendNotification: (method, params) => {
            if (websocket.readyState === WebSocket.OPEN) {
              websocket.send(
                JSON.stringify({
                  jsonrpc: '2.0',
                  method,
                  params,
                }),
              );
            }
          },

          /**
           * Registers a handler for LSP notifications from the server.
           * Used for server-initiated events like diagnostics publishing.
           *
           * @param method - LSP method name to listen for
           * @param handler - Function to handle the notification
           */
          onNotification: (method, handler) => {
            notificationHandlers.set(method, handler);
          },
        };

        websocket.onopen = () => {
          console.log('Connected to LSP WebSocket bridge');

          // Send initialize request
          languageClient
            .sendRequest('initialize', {
              processId: null,
              clientInfo: {
                name: 'mage-ai-monaco',
                version: '1.0.0',
              },
              capabilities: {
                textDocument: {
                  completion: {
                    dynamicRegistration: false,
                    completionItem: {
                      snippetSupport: true,
                      commitCharactersSupport: true,
                      documentationFormat: ['markdown', 'plaintext'],
                      deprecatedSupport: true,
                      preselectSupport: true,
                    },
                  },
                  hover: {
                    dynamicRegistration: false,
                    contentFormat: ['markdown', 'plaintext'],
                  },
                  signatureHelp: {
                    dynamicRegistration: false,
                    signatureInformation: {
                      documentationFormat: ['markdown', 'plaintext'],
                    },
                  },
                  publishDiagnostics: {
                    relatedInformation: true,
                    versionSupport: false,
                    tagSupport: { valueSet: [1, 2] },
                  },
                },
              },
            })
            .then(result => {
              console.log('LSP initialized:', result);

              // Send initialized notification
              languageClient.sendNotification('initialized', {});

              // Register text document
              const model = editor.getModel();
              if (model) {
                languageClient.sendNotification('textDocument/didOpen', {
                  textDocument: {
                    uri: model.uri.toString(),
                    languageId: 'python',
                    version: 1,
                    text: model.getValue(),
                  },
                });
              }
            })
            .catch(console.error);
        };

        websocket.onmessage = event => {
          try {
            const message = JSON.parse(event.data);

            if (message.id && pendingRequests.has(message.id)) {
              const { resolve, reject } = pendingRequests.get(message.id);
              pendingRequests.delete(message.id);

              if (message.error) {
                reject(new Error(message.error.message));
              } else {
                resolve(message.result);
              }
            } else if (message.method) {
              const handler = notificationHandlers.get(message.method);
              if (handler) {
                handler(message.params);
              }
            }
          } catch (error) {
            console.error('Error parsing LSP message:', error);
          }
        };

        websocket.onerror = error => {
          console.error('LSP WebSocket error:', error);
        };

        websocket.onclose = () => {
          console.log('LSP WebSocket connection closed');
          // Reject all pending requests
          pendingRequests.forEach(({ reject }) => {
            reject(new Error('WebSocket connection closed'));
          });
          pendingRequests.clear();
        };

        return { languageClient, websocket };
      };

      const { languageClient, websocket } = createLanguageClient();

      /**
       * Registers a completion provider that requests autocompletion from the LSP server.
       * Provides rich IntelliSense features including:
       * - Context-aware completions
       * - Snippet support
       * - Documentation preview
       * - Proper filtering and sorting
       */
      const completionProvider = monaco.languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.', ' ', '('],

        /**
         * Provides completion items for the given position in the document.
         * Sends a completion request to the LSP server and converts the response
         * to Monaco Editor's completion format.
         *
         * @param model - Monaco text model
         * @param position - Cursor position
         * @param context - Completion context (trigger character, etc.)
         * @returns Promise with completion suggestions
         */
        provideCompletionItems: async (model, position, context) => {
          try {
            const result = await languageClient.sendRequest('textDocument/completion', {
              textDocument: { uri: model.uri.toString() },
              position: {
                line: position.lineNumber - 1,
                character: position.column - 1,
              },
              context: {
                triggerKind: context.triggerKind,
                triggerCharacter: context.triggerCharacter,
              },
            });

            if (!result) return { suggestions: [] };

            let items: any[] = [];
            if (Array.isArray(result)) {
              items = result;
            } else if (
              result &&
              typeof result === 'object' &&
              'items' in result &&
              Array.isArray((result as any).items)
            ) {
              items = (result as any).items;
            }

            const suggestions = items.map((item, index) => ({
              label: item.label,
              kind: convertLSPKindToMonaco(monaco, item.kind),
              documentation: formatDocumentation(item.documentation),
              detail: item.detail || '',
              insertText: item.insertText || item.label,
              insertTextRules:
                item.insertTextFormat === 2
                  ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                  : undefined,
              range: item.textEdit
                ? convertLSPRangeToMonaco(item.textEdit.range, position)
                : undefined,
              sortText: item.sortText || `${index.toString().padStart(4, '0')}`,
              filterText: item.filterText || item.label,
              preselect: item.preselect,
              commitCharacters: item.commitCharacters,
            }));

            return { suggestions };
          } catch (error) {
            console.error('Completion request failed:', error);
            return { suggestions: [] };
          }
        },
      });

      /**
       * Registers a hover provider that shows documentation and type information.
       * Displays rich hover tooltips with symbol information, documentation,
       * and type signatures when hovering over code elements.
       */
      const hoverProvider = monaco.languages.registerHoverProvider('python', {
        /**
         * Provides hover information for the symbol at the given position.
         *
         * @param model - Monaco text model
         * @param position - Mouse hover position
         * @returns Promise with hover content or null
         */
        provideHover: async (model, position) => {
          try {
            const result = await languageClient.sendRequest('textDocument/hover', {
              textDocument: { uri: model.uri.toString() },
              position: {
                line: position.lineNumber - 1,
                character: position.column - 1,
              },
            });

            if (
              !result ||
              typeof result !== 'object' ||
              result === null ||
              !('contents' in result)
            ) {
              return null;
            }

            return {
              contents: formatHoverContents((result as { contents: any; range?: any }).contents),
              range: (result as any).range
                ? convertLSPRangeToMonacoRange((result as any).range)
                : undefined,
            };
          } catch (error) {
            console.error('Hover request failed:', error);
            return null;
          }
        },
      });

      /**
       * Registers a signature help provider for function parameter assistance.
       * Shows function signatures, parameter information, and active parameter
       * highlighting when typing function calls.
       */
      const signatureProvider = monaco.languages.registerSignatureHelpProvider('python', {
        signatureHelpTriggerCharacters: ['(', ','],

        /**
         * Provides signature help for function calls at the given position.
         *
         * @param model - Monaco text model
         * @param position - Cursor position
         * @returns Promise with signature help or null
         */
        provideSignatureHelp: async (model, position) => {
          try {
            const result = await languageClient.sendRequest('textDocument/signatureHelp', {
              textDocument: { uri: model.uri.toString() },
              position: {
                line: position.lineNumber - 1,
                character: position.column - 1,
              },
            });

            if (
              !result ||
              typeof result !== 'object' ||
              result === null ||
              !('signatures' in result) ||
              !Array.isArray((result as any).signatures)
            ) {
              return null;
            }

            return {
              signatures: (result as any).signatures.map((sig: any) => ({
                label: sig.label,
                documentation: formatDocumentation(sig.documentation),
                parameters:
                  sig.parameters?.map((param: any) => ({
                    label: param.label,
                    documentation: formatDocumentation(param.documentation),
                  })) || [],
              })),
              activeSignature: (result as any).activeSignature || 0,
              activeParameter: (result as any).activeParameter || 0,
            };
          } catch (error) {
            console.error('Signature help request failed:', error);
            return null;
          }
        },
      });

      /**
       * Handles diagnostic notifications from the LSP server.
       * Converts LSP diagnostics (errors, warnings, hints) to Monaco markers
       * and displays them in the editor with appropriate styling.
       */
      languageClient.onNotification('textDocument/publishDiagnostics', params => {
        const model = editor.getModel();
        if (!model || model.uri.toString() !== params.uri) return;

        const markers = params.diagnostics.map(diagnostic => ({
          severity: convertLSPSeverityToMonaco(monaco, diagnostic.severity),
          message: diagnostic.message,
          source: diagnostic.source,
          startLineNumber: diagnostic.range.start.line + 1,
          startColumn: diagnostic.range.start.character + 1,
          endLineNumber: diagnostic.range.end.line + 1,
          endColumn: diagnostic.range.end.character + 1,
          relatedInformation: diagnostic.relatedInformation?.map(info => ({
            resource: monaco.Uri.parse(info.location.uri),
            message: info.message,
            startLineNumber: info.location.range.start.line + 1,
            startColumn: info.location.range.start.character + 1,
            endLineNumber: info.location.range.end.line + 1,
            endColumn: info.location.range.end.character + 1,
          })),
        }));

        monaco.editor.setModelMarkers(model, 'python-lsp', markers);
      });

      // Handle text changes
      let changeTimeout;
      editor.onDidChangeModelContent(() => {
        const model = editor.getModel();
        if (!model) return;

        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(() => {
          languageClient.sendNotification('textDocument/didChange', {
            textDocument: {
              uri: model.uri.toString(),
              version: model.getVersionId(),
            },
            contentChanges: [
              {
                text: model.getValue(),
              },
            ],
          });
        }, 300);
      });

      // Store references for cleanup
      editor._lspWebSocket = websocket;
      editor._lspProviders = [completionProvider, hoverProvider, signatureProvider];
      editor._lspLanguageClient = languageClient;
    } catch (error) {
      console.error('Failed to initialize Python LSP:', error);
    }
  }, []);

  /**
   * Converts LSP completion item kinds to Monaco Editor completion kinds.
   * Maps LSP's numeric kind values to Monaco's enum values for proper
   * icon display and categorization in the completion dropdown.
   *
   * @param monaco - Monaco Editor API instance
   * @param lspKind - LSP completion item kind (numeric)
   * @returns Monaco completion item kind enum value
   */
  const convertLSPKindToMonaco = useCallback((monaco, lspKind) => {
    const kindMap = {
      1: monaco.languages.CompletionItemKind.Text, // Plain text
      2: monaco.languages.CompletionItemKind.Method, // Class method
      3: monaco.languages.CompletionItemKind.Function, // Function
      4: monaco.languages.CompletionItemKind.Constructor, // Class constructor
      5: monaco.languages.CompletionItemKind.Field, // Class field
      6: monaco.languages.CompletionItemKind.Variable, // Variable
      7: monaco.languages.CompletionItemKind.Class, // Class definition
      8: monaco.languages.CompletionItemKind.Interface, // Interface
      9: monaco.languages.CompletionItemKind.Module, // Module/package
      10: monaco.languages.CompletionItemKind.Property, // Object property
      11: monaco.languages.CompletionItemKind.Unit, // Unit value
      12: monaco.languages.CompletionItemKind.Value, // Generic value
      13: monaco.languages.CompletionItemKind.Enum, // Enumeration
      14: monaco.languages.CompletionItemKind.Keyword, // Language keyword
      15: monaco.languages.CompletionItemKind.Snippet, // Code snippet
      16: monaco.languages.CompletionItemKind.Color, // Color value
      17: monaco.languages.CompletionItemKind.File, // File reference
      18: monaco.languages.CompletionItemKind.Reference, // Reference
      19: monaco.languages.CompletionItemKind.Folder, // Directory
      20: monaco.languages.CompletionItemKind.EnumMember, // Enum member
      21: monaco.languages.CompletionItemKind.Constant, // Constant value
      22: monaco.languages.CompletionItemKind.Struct, // Structure
      23: monaco.languages.CompletionItemKind.Event, // Event
      24: monaco.languages.CompletionItemKind.Operator, // Operator
      25: monaco.languages.CompletionItemKind.TypeParameter, // Generic type parameter
    };
    return kindMap[lspKind] || monaco.languages.CompletionItemKind.Text;
  }, []);

  /**
   * Converts LSP diagnostic severity levels to Monaco Editor marker severity.
   * Maps LSP's numeric severity values to Monaco's severity enum for proper
   * visual styling of errors, warnings, and hints in the editor.
   *
   * @param monaco - Monaco Editor API instance
   * @param severity - LSP diagnostic severity (1=Error, 2=Warning, 3=Info, 4=Hint)
   * @returns Monaco marker severity enum value
   */
  const convertLSPSeverityToMonaco = useCallback((monaco, severity) => {
    const severityMap = {
      1: monaco.MarkerSeverity.Error, // Red underline and error icon
      2: monaco.MarkerSeverity.Warning, // Yellow/orange underline and warning icon
      3: monaco.MarkerSeverity.Info, // Blue underline and info icon
      4: monaco.MarkerSeverity.Hint, // Subtle styling for hints
    };
    return severityMap[severity] || monaco.MarkerSeverity.Info;
  }, []);

  /**
   * Formats LSP documentation content for Monaco Editor display.
   * Handles various documentation formats including plain text, markdown,
   * and structured documentation objects. Ensures proper rendering in
   * completion tooltips and hover information.
   *
   * @param doc - LSP documentation (string, object, or MarkupContent)
   * @returns Formatted documentation object for Monaco or undefined
   */
  const formatDocumentation = useCallback(doc => {
    if (!doc) return undefined;

    // Handle plain string documentation
    if (typeof doc === 'string') return { value: doc };

    // Handle MarkupContent with markdown
    if (doc.kind === 'markdown') return { value: doc.value, isTrusted: true };

    // Handle other structured documentation
    return { value: doc.value || doc };
  }, []);

  /**
   * Formats hover contents from LSP response for Monaco Editor display.
   * Processes hover content arrays and individual content items, ensuring
   * proper formatting for rich hover tooltips with markdown support.
   *
   * @param contents - LSP hover contents (array or single content item)
   * @returns Array of formatted content objects for Monaco hover
   */
  const formatHoverContents = useCallback(
    contents => {
      if (!contents) return [];

      // Handle array of content items
      if (Array.isArray(contents)) {
        return contents.map(formatDocumentation).filter(Boolean);
      }

      // Handle single content item
      const formatted = formatDocumentation(contents);
      return formatted ? [formatted] : [];
    },
    [formatDocumentation],
  );

  /**
   * Converts LSP range coordinates to Monaco Editor range format.
   * LSP uses 0-based line/character positions, while Monaco uses 1-based
   * line numbers and 1-based column positions. Used for text edits and replacements.
   *
   * @param lspRange - LSP range with start/end positions
   * @param position - Current cursor position (for context)
   * @returns Monaco range object with 1-based coordinates
   */
  const convertLSPRangeToMonaco = useCallback((lspRange, position) => {
    return {
      startLineNumber: lspRange.start.line + 1, // Convert 0-based to 1-based line
      startColumn: lspRange.start.character + 1, // Convert 0-based to 1-based column
      endLineNumber: lspRange.end.line + 1, // Convert 0-based to 1-based line
      endColumn: lspRange.end.character + 1, // Convert 0-based to 1-based column
    };
  }, []);

  /**
   * Converts LSP range to Monaco Range object for hover and diagnostic display.
   * Similar to convertLSPRangeToMonaco but returns a range object suitable
   * for highlighting and visual feedback in the editor.
   *
   * @param lspRange - LSP range with start/end positions
   * @returns Monaco range object for visual highlighting
   */
  const convertLSPRangeToMonacoRange = useCallback(lspRange => {
    return {
      startLineNumber: lspRange.start.line + 1,
      startColumn: lspRange.start.character + 1,
      endLineNumber: lspRange.end.line + 1,
      endColumn: lspRange.end.character + 1,
    };
  }, []);

  // Cleanup WebSocket and providers on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current?._lspWebSocket) {
        editorRef.current._lspWebSocket.close();
      }
      if (editorRef.current?._lspProviders) {
        editorRef.current._lspProviders.forEach(provider => provider.dispose());
      }
    };
  }, []);

  useEffect(() => {
    let autoSaveInterval;
    if (autoSave && onSave) {
      autoSaveInterval = setInterval(() => {
        onSave(editorRef.current.getValue());
      }, DEFAULT_AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSave && autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, onSave]);

  const selectedPrevious = usePrevious(selected);
  const textareaFocusedPrevious = usePrevious(textareaFocused);

  // This allows us to press escape and remove focus on the text.
  useEffect(() => {
    if (editorRef?.current) {
      clearTimeout(timeoutRef.current);

      if (selected && textareaFocused) {
        timeoutRef.current = setTimeout(() => {
          editorRef.current.focus();
        }, 1);
      } else {
        // eslint-disable-next-line react/no-find-dom-node
        const textarea = ReactDOM.findDOMNode(
          editorRef.current._domElement,
          // @ts-ignore
        )?.getElementsByClassName('inputarea');
        textarea[0].blur();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedPrevious, textareaFocused, textareaFocusedPrevious]);

  useEffect(() => {
    if (monacoRef?.current && editorRef?.current) {
      const shortcuts = [];
      shortcutsProp?.forEach(func => {
        shortcuts.push(func(monacoRef?.current, editorRef?.current));
      });
      addKeyboardShortcut(monacoRef?.current, editorRef?.current, shortcuts);
    }
    /*
     * The original block scope when the component was mounted is retained in the
     * shortcuts unless we re-add them when the block connections change. For example,
     * if a block originally had 1 upstream dependency but we add an additional dependency
     * and then try to execute the block via editor shortcut, the code execution only includes
     * the initial single upstream dependency because the shortcut's scope doesn't change.
     *
     * We don't need to include shortcutsProp in the dependency array because we only want to
     * re-add the keyboard shortcuts when the upstream or downstream connections change.
     * Including shortcutsProp in the dependency array may lead to unnecessary re-renders.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block?.downstream_blocks, block?.upstream_blocks]);

  useEffect(
    () => () => {
      completionDisposable.map(cd => cd.dispose());
    },
    [completionDisposable],
  );

  useEffect(() => {
    if (monacoInstance && autocompleteProviders) {
      if (
        (completionDisposable.length === 0 && textareaFocused) ||
        (!textareaFocusedPrevious && textareaFocused)
      ) {
        setCompletionDisposable(addAutocompleteSuggestions(monacoInstance, autocompleteProviders));
      } else if (textareaFocusedPrevious && !textareaFocused) {
        completionDisposable.map(cd => cd.dispose());
      }
    }
  }, [
    autocompleteProviders,
    completionDisposable,
    monacoInstance,
    textareaFocused,
    textareaFocusedPrevious,
  ]);

  const EditorElement = useMemo(() => (showDiffs ? DiffEditor : Editor), [showDiffs]);

  return (
    <ContainerStyle
      hideDuplicateMenuItems
      padding={padding}
      ref={ref}
      style={{
        display: mounted ? null : 'none',
        width: containerWidth,
      }}
    >
      {placeholder && !value?.length && (
        <PlaceholderStyle>
          <Text monospace muted>
            {placeholder}
          </Text>
        </PlaceholderStyle>
      )}
      <EditorElement
        beforeMount={handleEditorWillMount}
        height={height}
        language={language || DEFAULT_LANGUAGE}
        modified={showDiffs ? value : undefined}
        onChange={(val: string) => {
          onChange?.(val);
        }}
        onMount={handleEditorDidMount}
        // https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.IStandaloneEditorConstructionOptions.html
        options={{
          domReadOnly: readOnly,
          fontFamily: MONO_FONT_FAMILY_REGULAR,
          fontLigatures: true,
          fontSize,
          hideCursorInOverviewRuler: true,
          lineNumbers: showLineNumbers ? 'on' : 'off',
          minimap: {
            enabled: !!minimap,
          },
          overviewRulerBorder: false,
          readOnly,
          renderLineHighlightOnlyWhenFocus: true,
          scrollBeyondLastLine: false,
          // https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.IEditorScrollbarOptions.html
          scrollbar: {
            alwaysConsumeMouseWheel: false,
            vertical: 'hidden',
          },
          useShadowDOM: false,
          wordWrap: block?.type === BlockTypeEnum.MARKDOWN ? 'on' : 'off',
          // Options for DiffEditor
          colorDecorators: true,
          diffAlgorithm: 'advanced',
          enableSplitViewResizing: true,
          renderIndicators: true,
          renderLineHighlight: 'all',
          renderMarginRevertIcon: true,
          renderSideBySide: true,
          // Enable LSP features for Python
          quickSuggestions: language === 'python',
          suggestOnTriggerCharacters: language === 'python',
          acceptSuggestionOnEnter: language === 'python' ? 'on' : 'off',
          tabCompletion: language === 'python' ? 'on' : 'off',
        }}
        original={showDiffs ? originalValue : undefined}
        theme={loadedTheme || 'vs-dark'}
        value={showDiffs ? undefined : value}
        width={width}
      />
      <div ref={refBottomOfEditor} />
    </ContainerStyle>
  );
}

export default React.forwardRef(CodeEditor);
