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
  theme: themeSelected = IDEThemeEnum.BASE,
  uuid,
}: IDEProps) {
  const wrapperCount = useRef(0);

  const containerRef = useRef(null);
  const initializingRef = useRef(false);

  const languageClientRef = useRef(null);
  const editorRef = useRef(null);
  const mountedRef = useRef(false);
  const wrapperRef = useRef(null);

  const {
    filesInitialized,
    isInitialized,
    isLanguageServerStarted,
    loadingFiles,
    wrapper,
  } = useManager({
    codeResources: {
      main: {
        enforceLanguageId: file?.language || LanguageEnum.PYTHON,
        text: file?.content || file?.path,
        uri: `file://${file?.path}`,
      },
    },
  });

  async function addNewModel(codeResources): Promise<void> {
    const editorApp = wrapperRef?.current?.getMonacoEditorApp();
    const editor = editorRef?.current;

    if (!editor) {
        return Promise.reject(new Error('You cannot add a new model as neither editor nor diff editor is available.'));
    }

    // Step 1: Create a new model reference
    const newModelRef = await editorApp.buildModelRef(codeResources);
    if (!newModelRef) {
        return Promise.reject(new Error('Failed to create new model reference.'));
    }

    // Step 2: Update editor models with the new model
    const modelRefs = { modelRef: newModelRef, modelRefOriginal: undefined };
    await editorApp.updateEditorModels(modelRefs);

    console.log(editorApp.getTextModels());
    console.log(editorApp.getModelRefs());

    const textModel = editorApp.getTextModels()?.text;
    textModel?.setValue(`print("Hello, World!") ${Number(new Date())} ${textModel.uri}`);
  }

  useEffect(() => {
    if (!initializingRef?.current && containerRef?.current && !wrapperRef?.current && wrapper) {
      const initializeWrapper = async () => {
        initializingRef.current = true;

        if (wrapper) {
          try {
            wrapperRef.current = wrapper;
            await wrapper.start(containerRef.current);

            editorRef.current = wrapperRef.current.getEditor();
            languageClientRef.current = wrapperRef.current.languageClientWrapper.getLanguageClient();
          } catch (error) {
            console.error('[ERROR] IDE: error while initializing Monaco editor:', error);
          } finally {
            initializingRef.current = false;
            wrapperCount.current += 1;
          }
        }
      };

      initializeWrapper();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper]);

  return (
    <ContainerStyled>
      {!(isInitialized && isLanguageServerStarted && filesInitialized) && <Loading />}

      <IDEStyled className={mountedRef?.current ? 'mounted' : ''}>
        <div ref={containerRef} style={{ height: '100vh' }} />
      </IDEStyled>

      <div id={`monaco-suggest-application-root-${uuid}`} />
    </ContainerStyled>
  );
}

export default MateriaIDE;
