import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import baseConfigurations from './configurations/base';
import initializeAutocomplete from './autocomplete';
import initializeThemes from './themes/setup';
import loadExtensionsAndModules from './extensions/loader';
import mockCode from './mocks/code';
import setupPython from './languages/python';
import { ContainerStyled, IDEStyled } from './index.style';
import { getHost } from '@api/utils/url';
import { IDEThemeEnum } from './themes/interfaces';

type IDEProps = {
  theme?: IDEThemeEnum;
  uuid: string;
};

function MateriaIDE({ theme: themeSelected, uuid }: IDEProps) {
  const editorCount = useRef(0);
  const renderCount = useRef(0);
  const useEffectCount = useRef(0);

  // References to the root DOM elements where expansions are rendered in.
  const refRoots = useRef({});

  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(false);

  const themeContext = useContext(ThemeContext);
  const configurations = useMemo(() => baseConfigurations(themeContext, {
    theme: themeSelected,
    value: mockCode,
  }), [themeContext, themeSelected]);

  useEffect(() => {
    useEffectCount.current += 1;
    console.log(`[IDE] Use effect: ${useEffectCount?.current}`);

    if (!initializingRef?.current && containerRef?.current && !editorRef?.current) {
      const initializeEditor = async () => {
        initializingRef.current = true;

        const monaco = await import('monaco-editor');
        monaco.languages.register({ id: 'python' });

        // Configure a proxy for the web worker
        window.MonacoEnvironment = {
          getWorkerUrl: function (workerId, label) {
            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
              self.MonacoEnvironment = {
                baseUrl: '${getHost()}/monaco-editor/min/'
              };
              importScripts('${getHost()}/monaco-editor/min/vs/base/worker/workerMain.js');`,
            )}`;
          },
        };

        if (monaco.editor.getEditors().length === 0) {
          setupPython(monaco);
          initializeThemes(monaco);

          editorRef.current = monaco.editor.create(containerRef.current, configurations);

          const uuidRoot = 'suggest';
          if (!refRoots?.current?.[uuidRoot]) {
            const domNode = document.getElementById('monaco-suggest-application-root');
            if (domNode) {
              const root = createRoot(domNode);
              refRoots.current[uuidRoot] = root;
            }
          }

          initializeAutocomplete(monaco, editorRef.current, {
            roots: refRoots?.current,
          });
        } else {
          console.warn('Editor already initialized');
        }

        await loadExtensionsAndModules();

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

      <div id={`monaco-suggest-application-root-${uuid}`} />
    </ContainerStyled>
  );
}

export default MateriaIDE;
