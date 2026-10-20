import * as ReactDOM from 'react-dom';
import Editor, { DiffEditor, loader } from '@monaco-editor/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
};

type CodeEditorProps = {
  autocompleteProviders?: ProvidersType;
  autoHeight?: boolean;
  autoSave?: boolean;
  block?: BlockType;
  containerWidth?: number | string;
  editorRef?: any;
  fontSize?: number;
  language?: string;
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
  value?: string;
  width?: number | string;
} & CodeEditorSharedProps;

function CodeEditor(
  {
    autocompleteProviders,
    autoHeight,
    autoSave,
    block,
    containerWidth,
    editorRef: editorRefProp,
    fontSize = DEFAULT_FONT_SIZE,
    height,
    language,
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
    setSelected,
    setTextareaFocused,
    shortcuts: shortcutsProp,
    showDiffs,
    showLineNumbers = true,
    tabSize = 4,
    textareaFocused,
    theme = DEFAULT_THEME,
    value,
    width = '100%',
  }: CodeEditorProps,
  ref,
) {
  const editorRef = editorRefProp || useRef(null);
  const monacoRef = useRef(null);
  const refBottomOfEditor = useRef(null);

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

      const shortcuts = [];

      shortcutsProp?.forEach(func => {
        shortcuts.push(func(monaco, editor));
      });

      if (!showDiffs) {
        // Keyboard shortcuts for saving content: Command + S
        if (onSave) {
          shortcuts.push(
            saveCode(monaco, () => {
              onSave(editor.getValue());
            }),
          );
        }
      }

      addKeyboardShortcut(monaco, editor, shortcuts);

      if (!showDiffs) {
        editor.getModel().updateOptions({
          tabSize,
        });
      }

      if (autoHeight && !height) {
        editor._domElement.style.height = `${calculateHeightFromContent(value || '')}px`;
      }

      if (!showDiffs) {
        editor.onDidFocusEditorWidget(() => {
          /*
           * Added onClick handler for selecting block in CodeContainerStyle component.
           * Disabled the setSelected call below because if a user updates the block name
           * or color from the Block Settings in the Sidekick, clicking on the code editor
           * specifically uses an outdated block as the "selectedBlock" due to scoping issues
           * when mounting the code editor here.
           */
          // setSelected?.(true);
          setTextareaFocused?.(true);
        });
      }

      if (!showDiffs) {
        editor.onDidContentSizeChange(({ contentHeight, contentHeightChanged }) => {
          if (autoHeight && contentHeightChanged) {
            editor._domElement.style.height = `${contentHeight + SINGLE_LINE_HEIGHT * 2}px`;
          }

          if (onContentSizeChangeCallback) {
            onContentSizeChangeCallback?.();
          }
        });
      }

      if (selected && textareaFocused) {
        setTimeout(() => {
          editor.focus();
        }, 1);
      }

      if (onDidChangeCursorPosition) {
        editor.onDidChangeCursorPosition(({ position: { lineNumber } }) => {
          const { height, top } = editor._domElement.getBoundingClientRect();
          const lineNumberTop = editor.getTopForLineNumber(lineNumber);

          onDidChangeCursorPosition({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      autoHeight,
      height,
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
  }, [autoSave, editorRef, onSave]);

  const selectedPrevious = usePrevious(selected);
  const textareaFocusedPrevious = usePrevious(textareaFocused);

  useEffect(() => {
    if (editorRef?.current) {
      if (selected && textareaFocused) {
        setTimeout(() => {
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
  }, [editorRef, selected, selectedPrevious, textareaFocused, textareaFocusedPrevious]);

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

  const EditorElement = showDiffs ? DiffEditor : Editor;

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
            enabled: false,
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
