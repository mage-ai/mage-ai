import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as ReactDOM from 'react-dom';
import Editor from '@monaco-editor/react';

import {
  DEFAULT_AUTO_SAVE_INTERVAL,
  DEFAULT_FONT_SIZE,
  DEFAULT_LANGUAGE,
  DEFAULT_THEME,
} from './constants';
import { addKeyboardShortcut } from './keyboard_shortcuts';
import { calculateHeightFromContent } from './utils';
import { defineTheme } from './utils';
import {
  saveCode,
  testShortcut,
} from './keyboard_shortcuts/shortcuts';

type CodeEditorProps = {
  autoHeight?: boolean;
  autoSave?: boolean;
  content?: string;
  defaultValue?: string;
  fontSize?: number;
  height?: number | string;
  language?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  theme?: any;
  width?: number | string;
};



function CodeEditor({
  autoHeight,
  autoSave,
  defaultValue,
  fontSize = DEFAULT_FONT_SIZE,
  height,
  language,
  onChange,
  onSave,
  theme: themeProp,
  width = '100%',
}: CodeEditorProps) {
  console.log('CodeEditor render');

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const editorElementParentRef = useRef(null);

  const [content, setContent] = useState('');
  const [heightOfContent, setHeightOfContent] = useState(height);
  const [theme, setTheme] = useState(themeProp || DEFAULT_THEME);

  const handleEditorWillMount = useCallback((monaco) => {
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  }, []);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const shortcuts = [
      testShortcut(monaco),
    ];

    if (onSave) {
      shortcuts.push(saveCode(monaco, () => {
        onSave(editor.getValue());
      }));
    }

    addKeyboardShortcut(monaco, editor, shortcuts);

    editor.getModel().updateOptions({
      tabSize: 4,
    });

    if (autoHeight && !height) {
      editor._domElement.style.height =
        `${calculateHeightFromContent(defaultValue || '')}px`;
    }
  }, [
    autoHeight,
    defaultValue,
    height,
    onSave,
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

  return (
    <Editor
      beforeMount={handleEditorWillMount}
      defaultValue={defaultValue}
      height={height}
      language={language || DEFAULT_LANGUAGE}
      onChange={(val: string) => {
        onChange?.(val);

        if (autoHeight) {
          editorRef.current._domElement.style.height = `${calculateHeightFromContent(val)}px`;
        }
      }}
      onMount={handleEditorDidMount}
      // https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.IStandaloneEditorConstructionOptions.html
      options={{
        fontSize,
        hideCursorInOverviewRuler: true,
        minimap: {
          enabled: false,
        },
        overviewRulerBorder: false,
        scrollBeyondLastLine: false,
      }}
      theme={theme}
      // value={value}
      width={width}
    />
  );
}

export default CodeEditor;
