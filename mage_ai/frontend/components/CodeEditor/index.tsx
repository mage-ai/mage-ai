import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as ReactDOM from 'react-dom';
import Editor from '@monaco-editor/react';

import BlockType from '@interfaces/BlockType';
import Text from '@oracle/elements/Text';
import usePrevious from '@utils/usePrevious';
import {
  DEFAULT_AUTO_SAVE_INTERVAL,
  DEFAULT_LANGUAGE,
  DEFAULT_THEME,
} from './constants';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR_FONT_SIZE as DEFAULT_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import {
  ContainerStyle,
  PlaceholderStyle,
  SINGLE_LINE_HEIGHT,
} from './index.style';
import { ProvidersType } from './autocomplete/constants';
import { addAutocompleteSuggestions } from './autocomplete/utils';
import { addKeyboardShortcut } from './keyboard_shortcuts';
import { calculateHeightFromContent } from './utils';
import { defineTheme } from './utils';
import { saveCode } from './keyboard_shortcuts/shortcuts';

export type OnDidChangeCursorPositionParameterType = {
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
  fontSize?: number;
  language?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  padding?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  shortcuts?: ((monaco: any, editor: any) => void)[];
  showLineNumbers?: boolean;
  tabSize?: number;
  theme?: any;
  value?: string;
  width?: number | string;
} & CodeEditorSharedProps;

function CodeEditor({
  autocompleteProviders,
  autoHeight,
  autoSave,
  block,
  fontSize = DEFAULT_FONT_SIZE,
  height,
  language,
  onChange,
  onDidChangeCursorPosition,
  onSave,
  padding,
  placeholder,
  readOnly,
  selected,
  setSelected,
  setTextareaFocused,
  shortcuts: shortcutsProp,
  showLineNumbers = true,
  tabSize = 4,
  textareaFocused,
  theme: themeProp,
  value,
  width = '100%',
}: CodeEditorProps) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const refBottomOfEditor = useRef(null);

  const [completionDisposable, setCompletionDisposable] = useState([]);
  const [monacoInstance, setMonacoInstance] = useState(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [theme, setTheme] = useState(themeProp || DEFAULT_THEME);

  const handleEditorWillMount = useCallback((monaco) => {
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    setMonacoInstance(monaco);
  }, []);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const shortcuts = [];

    shortcutsProp?.forEach((func) => {
      shortcuts.push(func(monaco, editor));
    });

    // Keyboard shortcuts for saving content: Command + S
    if (onSave) {
      shortcuts.push(saveCode(monaco, () => {
        onSave(editor.getValue());
      }));
    }

    addKeyboardShortcut(monaco, editor, shortcuts);

    editor.getModel().updateOptions({
      tabSize,
    });

    if (autoHeight && !height) {
      editor._domElement.style.height =
        `${calculateHeightFromContent(value || '')}px`;
    }

    editor.onDidFocusEditorWidget(() => {
      setSelected?.(true);
      setTextareaFocused?.(true);
    });

    editor.onDidContentSizeChange(({
      contentHeight,
      contentHeightChanged,
    }) => {
      if (autoHeight && contentHeightChanged) {
        editor._domElement.style.height = `${contentHeight + (SINGLE_LINE_HEIGHT * 2)}px`;
      }
    });

    if (selected && textareaFocused) {
      setTimeout(() => {
        editor.focus();
      }, 1);
    }

    if (onDidChangeCursorPosition) {
      editor.onDidChangeCursorPosition(({
        position: {
          lineNumber,
        },
      }) => {
        const {
          height,
          top,
        } = editor._domElement.getBoundingClientRect();
        const lineNumberTop = editor.getTopForLineNumber(lineNumber);

        onDidChangeCursorPosition({
          editorRect: {
            height: Number(height),
            top: Number(top),
          },
          position: {
            lineNumberTop,
          },
        });
      });
    }

    setMounted(true);
  }, [
    autoHeight,
    height,
    onDidChangeCursorPosition,
    onSave,
    selected,
    setMounted,
    setSelected,
    setTextareaFocused,
    shortcutsProp,
    tabSize,
    textareaFocused,
    value,
  ]);

  useEffect(() => {
    defineTheme(DEFAULT_THEME).then(() => {
      setTheme(DEFAULT_THEME);
    });
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
  }, [
    autoSave,
    editorRef,
    onSave,
  ]);

  const selectedPrevious = usePrevious(selected);
  const textareaFocusedPrevious = usePrevious(textareaFocused);

  useEffect(() => {
    if (editorRef?.current) {
      if (selected && textareaFocused) {
        setTimeout(() => {
          editorRef.current.focus();
        }, 1);
      } else {
        const textarea = ReactDOM
          .findDOMNode(editorRef.current._domElement)
          // @ts-ignore
          .getElementsByClassName('inputarea');
        textarea[0].blur();
      }
    }
  }, [
    editorRef,
    selected,
    selectedPrevious,
    textareaFocused,
    textareaFocusedPrevious,
  ]);

  useEffect(() => {
    if (monacoRef?.current && editorRef?.current) {
      const shortcuts = [];
      shortcutsProp?.forEach((func) => {
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
   */
  }, [block?.downstream_blocks, block?.upstream_blocks]);

  useEffect(
    () => () => {
      completionDisposable.map(cd => cd.dispose());
    },
    [completionDisposable],
  );

  useEffect(() => {
    if (monacoInstance && autocompleteProviders) {
      if ((completionDisposable.length === 0 && textareaFocused) || (!textareaFocusedPrevious && textareaFocused)) {
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

  return (
    <ContainerStyle
      padding={padding}
      style={{
        display: mounted ? null : 'none',
      }}
    >
      {placeholder && !value?.length && (
        <PlaceholderStyle>
          <Text monospace muted>
            {placeholder}
          </Text>
        </PlaceholderStyle>
      )}
      <Editor
        beforeMount={handleEditorWillMount}
        height={height}
        language={language || DEFAULT_LANGUAGE}
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
          lineNumbers: showLineNumbers,
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
          wordBasedSuggestions: false,
        }}
        theme={theme}
        value={value}
        width={width}
      />
      <div ref={refBottomOfEditor} />
    </ContainerStyle>
  );
}

export default CodeEditor;
