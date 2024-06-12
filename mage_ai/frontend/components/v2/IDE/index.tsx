import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef } from 'react';

import Loading from '@mana/components/Loading';
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
import useManager from './useManager';

// import mockCode from './mocks/code';
// const codeUri = '/home/src/setup.py';

type IDEProps = {
  configurations?: any;
  file?: FileType;
  theme?: IDEThemeEnum;
  uuid: string;
};

function MateriaIDE({
  configurations: configurationsOverride,
  file,
  theme: themeSelected,
  uuid,
}: IDEProps) {
  const containerRef = useRef(null);
  const mountedRef = useRef(false);
  const managerRef = useRef(null);

  const {
    completions,
    initializeManager,
  } =
    useManager(uuid, {
      file,
      wrapper: {
        options: {
          configurations: {
            ...configurationsOverride,
            theme: themeSelected,
          },
        },
      },
    });

  useEffect(() => {
    if (containerRef?.current && !managerRef?.current) {
      const initializeWrapper = async () => {
        try {
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
                  // @ts-ignore
                  import('monaco-editor-wrapper/workers/module/ts').then(
                    module => new Worker(module.default, { type: 'module' }),
                  ),
              },
            });
          };

          configureMonacoWorkers();

          managerRef.current = await initializeManager();
          await managerRef.current.getWrapper().start(containerRef.current);
        } catch (error) {
          console.error('[ERROR] IDE: error while initializing Monaco editor:', error);
        }
      };

      initializeWrapper();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ContainerStyled>
      {!(completions?.wrapper && completions?.languageServer && completions?.workspace) && <Loading />}

      <IDEStyled className={mountedRef?.current ? 'mounted' : ''}>
        <div ref={containerRef} style={{ height: '100vh' }} />
      </IDEStyled>

      <div id={`monaco-suggest-application-root-${uuid}`} />
    </ContainerStyled>
  );
}

export default MateriaIDE;
