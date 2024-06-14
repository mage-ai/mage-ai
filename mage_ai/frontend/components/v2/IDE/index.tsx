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
import addListeners from './events/addListeners';

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
  const editorRef = useRef(null);
  const managerRef = useRef(null);
  const mainRef = useRef(null);

  const manager = useManager(uuid, {
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
    if (containerRef?.current && !managerRef.current && manager) {
      const initializeWrapper = async () => {
        managerRef.current = manager;
        await managerRef.current.start(containerRef.current);
        editorRef.current = managerRef.current.getEditor();
        addListeners(editorRef.current);
      };

      initializeWrapper();
    }

    const element = mainRef.current;
    if (manager && element && !element.classList.contains('mounted')) {
      if (element) {
        element.classList.add('mounted');
      }
    }

    const instance = managerRef?.current;
    return () => {
      if (instance) {
        instance.dispose();
      }
      editorRef.current = null;
      managerRef.current = null;
    };
  }, [manager]);

  return (
    <ContainerStyled ref={mainRef}>
      <Loading className="ide-loading" />

      <IDEStyled className="ide-container">
        <div ref={containerRef} style={{ height: '100vh' }} />
      </IDEStyled>

      <div id={`monaco-suggest-application-root-${uuid}`} />
    </ContainerStyled>
  );
}

export default MateriaIDE;
