import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import baseConfigurations from './configurations/base';
import initializeAutocomplete from './autocomplete';
import themes from './themes';
import { IDEThemeEnum } from './themes/interfaces';
import mockCode from './mocks/code';
import pythonProvider from './languages/python/provider';
import pythonConfiguration, { pythonLanguageExtension } from './languages/python/configuration';
import { ContainerStyled, IDEStyled } from './index.style';
import { LanguageEnum } from './languages/constants';
import { getHost } from '@api/utils/url';

type IDEProps = {
  theme?: IDEThemeEnum;
  uuid: string;
};

function MateriaIDE({ theme: themeSelected = IDEThemeEnum.BASE, uuid }: IDEProps) {
  const editorCount = useRef(0);
  const renderCount = useRef(0);
  const wrapperCount = useRef(0);

  const [monacoReady, setMonacoReady] = useState(false);

  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const initializingRef = useRef(false);
  const monacoRef = useRef(null);
  const mountedRef = useRef(false);
  const wrapperRef = useRef(null);

  const themeContext = useContext(ThemeContext);
  const configurations = useMemo(
    () =>
      baseConfigurations(themeContext, {
        theme: themeSelected,
        // value: mockCode,
      }),
    [themeContext, themeSelected],
  );

  useEffect(() => {
    if (!initializingRef?.current && containerRef?.current && !wrapperRef?.current) {
      const initializeWrapper = async () => {
        initializingRef.current = true;

        const monaco = await import('monaco-editor');
        const configUri = new URL('./languages/python/config.json', import.meta.url).href;
        const pythonLanguageExtensionWithURI = {
          ...pythonLanguageExtension,
          configuration: monaco.Uri.parse(
            `${getHost({
              forceCurrentPort: true,
            })}${configUri}`,
          ),
        };
        monaco.languages.register(pythonLanguageExtensionWithURI);
        monaco.languages.setLanguageConfiguration(
          pythonLanguageExtension.id,
          pythonConfiguration(),
        );
        initializeAutocomplete(monaco);

        const { MonacoEditorLanguageClientWrapper } = await import('monaco-editor-wrapper');
        const { useWorkerFactory } = await import('monaco-editor-wrapper/workerFactory');
        await import('@codingame/monaco-vscode-python-default-extension');

        const configureMonacoWorkers = () => {
          useWorkerFactory({
            ignoreMapping: true,
            workerLoaders: {
              editorWorkerService: () =>
                new Worker(
                  new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
                  { type: 'module' },
                ),
              javascript: () =>
                import('monaco-editor-wrapper/workers/module/ts').then(
                  module => new Worker(module.default, { type: 'module' }),
                ),
            },
          });
        };

        configureMonacoWorkers();

        const codeUri = '/home/src/setup.py';
        const userConfig = {
          loggerConfig: {
            enabled: true,
            debugEnabled: true,
          },
          languageClientConfig: {
            languageId: LanguageEnum.PYTHON,
            options: {
              $type: 'WebSocket',
              host: 'localhost',
              port: 8765,
              secured: false,
            },
          },
          wrapperConfig: {
            editorAppConfig: {
              $type: 'classic' as const,
              codeResources: {
                main: {
                  enforceLanguageId: LanguageEnum.PYTHON,
                  text: mockCode,
                  uri: codeUri,
                },
              },
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

        try {
          wrapperRef.current = new MonacoEditorLanguageClientWrapper();
          await wrapperRef.current.initAndStart(userConfig, containerRef.current);
        } catch (error) {
          console.error('Error initializing Monaco editor:', error);
        } finally {
          initializingRef.current = false;
          wrapperCount.current += 1;
          console.log(`[IDE] Wrapper: ${wrapperCount?.current}`);
        }
      };

      initializeWrapper();
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
