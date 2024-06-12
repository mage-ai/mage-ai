import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import baseConfigurations from './configurations/base';
import {
  ALL_SUPPORTED_FILE_EXTENSIONS_REGEX,
  COMMON_EXCLUDE_PATTERNS,
  FILE_EXTENSION_TO_LANGUAGE_MAPPING,
} from '@interfaces/FileType';
import { IDEThemeEnum } from './themes/interfaces';
import { onSuccess } from '@api/utils/response';
import { FileType } from './interfaces';
import { LanguageEnum } from './languages/constants';

function useManager(opts?: { codeResources?: any; configurations?: any; theme?: IDEThemeEnum }): {
  filesInitialized: boolean;
  isInitialized: boolean;
  isLanguageServerStarted: boolean;
  loadingFiles: boolean;
  wrapper: any;
} {
  const {
    codeResources,
    configurations: configurationsOverride,
    theme,
  } = opts || {
    codeResources: null,
    configurations: null,
    theme: IDEThemeEnum.BASE,
  };

  const themeContext = useContext(ThemeContext);
  const instanceRef = useRef<any | null>(null);
  const timeoutRef = useRef<any | null>(null);
  const wrapperRef = useRef<any | null>(null);

  const [files, setFiles] = useState<FileType[]>(null);
  const [filesInitialized, setFilesInitialized] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLanguageServerStarted, setIsLanguageServerStarted] = useState(false);

  const [fetchItems, { isLoading: loadingFiles }] = useMutation(
    (query?: {
      _limit?: number;
      _offset?: number;
      directory?: string;
      exclude_pattern?: string | RegExp;
      include_pattern?: string | RegExp;
    }) => api.browser_items.listAsync(query),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: ({ browser_items: items }) => {
            setFiles(items);
          },
          onErrorCallback: (response: any, errors: any) =>
            console.error({
              errors,
              response,
            }),
        }),
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
  );

  const configurations = useMemo(
    () =>
      baseConfigurations(themeContext, {
        ...configurationsOverride,
        theme,
      }),
    [configurationsOverride, theme, themeContext],
  );

  useEffect(() => {
    const initializeWrapper = async () => {
      if (!wrapperRef?.current) {
        const mod = await import('./Manager');
        const Manager = mod.Manager;
        instanceRef.current = Manager.getInstance();
        wrapperRef.current = await instanceRef.current.getWrapper({
          codeResources,
          configurations,
        });

        const check = () => {
          const done = wrapperRef?.current?.isInitDone();
          console.log('Wrapper initialized:', done);
          if (done) {
            setIsInitialized(done);
            clearTimeout(timeoutRef.current);
          } else {
            timeoutRef.current = setTimeout(() => check(), 1000);
          }
        };
        check();
      }
    };

    initializeWrapper();

    return () => {
      instanceRef.current = null;
      clearTimeout(timeoutRef.current);
    };
  }, [codeResources, configurations]);

  useEffect(() => {
    if (isInitialized && !isLanguageServerStarted) {
      const check = () => {
        const done = wrapperRef?.current?.languageClientWrapper?.isStarted();
        console.log('Language server started:', done);
        if (done) {
          setIsLanguageServerStarted(done);
          clearTimeout(timeoutRef.current);
        } else {
          timeoutRef.current = setTimeout(() => check(), 1000);
        }
      };
      check();
    }

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [isInitialized, isLanguageServerStarted]);

  useEffect(() => {
    if (files === null) {
      fetchItems({
        exclude_pattern: COMMON_EXCLUDE_PATTERNS,
        include_pattern: encodeURIComponent(String(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    if (isLanguageServerStarted && !filesInitialized && files !== null) {
      const languageClient = wrapperRef?.current?.languageClientWrapper?.getLanguageClient();

      let filesCount = 0;
      if (languageClient) {
        files.forEach(({ content, language, modified_timestamp: version, path }) => {
          if (LanguageEnum.PYTHON === language) {
            const textDocument = {
              languageId: language,
              text: content || '',
              uri: `file://${path}`,
              version,
            };

            languageClient.sendNotification('textDocument/didOpen', { textDocument });
            filesCount += 1;
          }
        });

        console.log(`Files initialized: ${filesCount}`);
      }

      setFilesInitialized(true);
    }
  }, [files, filesInitialized, isLanguageServerStarted]);

  return {
    filesInitialized,
    isInitialized,
    isLanguageServerStarted,
    loadingFiles,
    wrapper: wrapperRef?.current,
  };
}

export default useManager;
