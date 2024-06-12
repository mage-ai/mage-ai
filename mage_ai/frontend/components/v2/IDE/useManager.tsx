import { useEffect, useCallback, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, COMMON_EXCLUDE_PATTERNS } from '@interfaces/FileType';
import { InitializeProps } from './Manager';
import { onSuccess } from '@api/utils/response';
import { FileType } from './interfaces';

function useManager(uuid: string, opts?: InitializeProps): {
  completions: {
    languageServer: boolean;
    workspace: boolean;
    wrapper: boolean;
  };
  initializeManager: () => any;
} {
  const initiatedRef = useRef(false);
  const managerRef = useRef<any | null>(null);

  const [completions, setCompletions] = useState<{
    languageServer: boolean;
    workspace: boolean;
    wrapper: boolean;
  }>({
    languageServer: false,
    workspace: false,
    wrapper: false,
  });

  const [fetchItems, { isLoading: loadingFiles }] = useMutation(
    (query?: {
      _limit?: number;
      _offset?: number;
      directory?: string;
      exclude_pattern?: string | RegExp;
      include_pattern?: string | RegExp;
    }) => api.browser_items.listAsync({
      exclude_pattern: COMMON_EXCLUDE_PATTERNS,
      include_pattern: encodeURIComponent(String(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX)),
      ...query,
    }),
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetch = useCallback((callback) => fetchItems().then(({ data: { browser_items: items } }: { data: { browser_items: FileType[] } }) => callback(items)), []);

  const initializeManager = async () => {
    if (!managerRef?.current) {
      let manager = null;

      const mod = await import('./Manager');
      const Manager = mod.Manager;
      manager = Manager.getInstance(uuid);

      // const startWorkers = Manager.getWorkerFactoryInitializer();
      // await startWorkers();

      await manager.initialize({
        file: opts?.file,
        languageServer: {
          onComplete: (_a, _b, languageClient: any) => {
            console.log('Language server started:', languageClient);
            setCompletions(prev => ({ ...prev, languageServer: true }));
          },
        },
        workspace: {
          onComplete: (_a, _b, _c, files: FileType[]) => {
            console.log(`Files loaded: ${files?.length}`);
            setCompletions(prev => ({ ...prev, workspace: true }));
          },
          options: {
            fetch,
          },
        },
        wrapper: {
          ...opts?.wrapper?.options,
          onComplete: (wrapper: any) => {
            console.log('Wrapper initialized:', wrapper);
            setCompletions(prev => ({ ...prev, wrapper: true }));

            if (opts?.wrapper?.onComplete) {
              opts?.wrapper?.onComplete?.();
            }
          },
        },
      });

      initiatedRef.current = true;
      managerRef.current = manager;

      return manager;
    }
  };

  useEffect(() => {
    const manager = managerRef.current;

    return () => {
      manager?.cleanup();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    completions,
    initializeManager,
  };
}

export default useManager;
