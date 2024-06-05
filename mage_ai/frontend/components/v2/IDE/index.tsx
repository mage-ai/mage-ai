import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef } from 'react';

import baseConfigurations from './configurations/base';
import initializeAutocomplete from './autocomplete';
import initializeThemes from './themes/setup';
import mockCode from './mocks/code';
import setupPython from './languages/python';
import { ContainerStyled, IDEStyled } from './index.style';
import { IDEThemeEnum } from './themes/interfaces';
import { LanguageEnum } from './languages/constants';
// import { getHost } from '@api/utils/url';

type IDEProps = {
  theme?: IDEThemeEnum;
  uuid: string;
};

function MateriaIDE({ theme: themeSelected, uuid }: IDEProps) {
  const editorCount = useRef(0);
  const renderCount = useRef(0);
  const useEffectCount = useRef(0);

  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(false);

  const themeContext = useContext(ThemeContext);
  const configurations = useMemo(
    () =>
      baseConfigurations(themeContext, {
        theme: themeSelected,
        value: mockCode,
      }),
    [themeContext, themeSelected],
  );

  useEffect(() => {
    useEffectCount.current += 1;
    console.log(`[IDE] Use effect: ${useEffectCount?.current}`);

    if (!initializingRef?.current && containerRef?.current && !editorRef?.current) {
      const initializeEditor = async () => {
        initializingRef.current = true;

        const monaco = await import('monaco-editor');
        monaco.languages.register({ id: LanguageEnum.PYTHON });

        // Configure a proxy for the web worker
        // window.MonacoEnvironment = {
        //   getWorkerUrl: function (workerId, label) {
        //     return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        //       self.MonacoEnvironment = {
        //         baseUrl: '${getHost()}/monaco-editor/min/'
        //       };
        //       importScripts('${getHost()}/monaco-editor/min/vs/base/worker/workerMain.js');`)}`;
        //   },
        // };

        if (monaco.editor.getEditors().length === 0) {
          setupPython(monaco);
          initializeThemes(monaco);
          editorRef.current = monaco.editor.create(containerRef.current, configurations);
          initializeAutocomplete(monaco);
        } else {
          console.warn('Editor already initialized');
        }

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
