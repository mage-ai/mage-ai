import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef } from 'react';

import { IDEThemeEnum } from './themes/interfaces';
import baseConfigurations from './configurations/base';
import initializeThemes from './themes/setup';
import initializeAutocomplete from './autocomplete';
import mockCode from './mocks/code';
import setupPython from './languages/python';
import { ContainerStyled, IDEStyled } from './index.style';
import { getHost } from '@api/utils/url';

const loadExtensionsAndModules = async () => {
  // import '@codingame/monaco-vscode-json-default-extension';
  // import '@codingame/monaco-vscode-json-language-features-default-extension'';
  // import '@codingame/monaco-vscode-markdown-basics-default-extension';
  // import '@codingame/monaco-vscode-markdown-language-features-default-extension';
  // import '@codingame/monaco-vscode-markdown-math-default-extension'';
  // import '@codingame/monaco-vscode-r-default-extension'';
  // import '@codingame/monaco-vscode-sql-default-extension';
  // import '@codingame/monaco-vscode-typescript-basics-default-extension'';
  // import '@codingame/monaco-vscode-yaml-default-extension'';
  await import('@codingame/monaco-vscode-python-default-extension');
  const [
    { CloseAction, ErrorAction, MessageTransports },
    { MonacoEditorLanguageClientWrapper, UserConfig },
    { MonacoLanguageClient },
    { WebSocketMessageReader, WebSocketMessageWriter, toSocket },
    { useWorkerFactory },
  ] = await Promise.all([
    import('vscode-languageclient'),
    import('monaco-editor-wrapper'),
    import('monaco-languageclient'),
    import('vscode-ws-jsonrpc'),
    import('monaco-editor-wrapper/workerFactory'),
  ]);
  return {
    CloseAction,
    ErrorAction,
    MessageTransports,
    MonacoEditorLanguageClientWrapper,
    MonacoLanguageClient,
    UserConfig,
    WebSocketMessageReader,
    WebSocketMessageWriter,
    toSocket,
    useWorkerFactory,
  };
};

type IDEProps = {
  theme?: IDEThemeEnum;
  uuid: string;
};

function MateriaIDE({ theme: themeSelected = IDEThemeEnum.BASE, uuid }: IDEProps) {
  const editorCount = useRef(0);
  const renderCount = useRef(0);
  const useEffectCount = useRef(0);

  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(false);

  const themeContext = useContext(ThemeContext);
  const configurations = useMemo(() => baseConfigurations(themeContext, {
    value: mockCode,
  }), [themeContext]);


  useEffect(() => {
    useEffectCount.current += 1;
    console.log(`[IDE] Use effect: ${useEffectCount?.current}`);

    if (!initializingRef?.current && containerRef?.current && !editorRef?.current) {
      const initializeEditor = async () => {
        initializingRef.current = true;

        const monaco = await import('monaco-editor');
        monaco.languages.register({ id: 'python' });

        if (monaco.editor.getEditors().length === 0) {
          setupPython(monaco);
          initializeThemes(monaco);
          initializeAutocomplete(monaco);

          editorRef.current = monaco.editor.create(
            containerRef.current,
            configurations,
          );
        } else {
          console.warn('Editor already initialized');
        }

        const modules = await loadExtensionsAndModules();
        console.log(modules);

        editorCount.current += 1;
        console.log(`[IDE] Editor: ${editorCount?.current}`);
        mountedRef.current = true;
      };

      initializeEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  renderCount.current += 1;
  console.log(`[IDE] Rendered: ${renderCount?.current}`);

  return (
    <ContainerStyled>
      <IDEStyled className={mountedRef?.current ? 'mounted' : ''}>
        <div ref={containerRef} style={{ height: '100vh' }} />
      </IDEStyled>
    </ContainerStyled>
  );
}

export default MateriaIDE;
