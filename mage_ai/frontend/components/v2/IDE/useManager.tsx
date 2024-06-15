import { useEffect, useCallback, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import { ResourceType } from './interfaces';
import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, COMMON_EXCLUDE_PATTERNS } from '@interfaces/FileType';
import { FileType } from './interfaces';

function useManager(uuid: string, resource: ResourceType, opts?: any): any {
  const initiatedRef = useRef(false);
  const managerRef = useRef(null);

  const [manager, setManager] = useState<any>(null);
  const [completions, setCompletions] = useState<{
    languageServer: boolean;
    workspace: boolean;
    wrapper: boolean;
  }>({
    languageServer: false,
    workspace: false,
    wrapper: false,
  });

  const [fetchItems] = useMutation(
    (query?: {
      _limit?: number;
      _offset?: number;
      directory?: string;
      exclude_pattern?: string | RegExp;
      include_pattern?: string | RegExp;
      paths?: string;
    }) =>
      api.browser_items.listAsync({
        exclude_pattern: COMMON_EXCLUDE_PATTERNS,
        include_pattern: encodeURIComponent(String(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX)),
        ...query,
      }),
  );

  const fetch = useCallback(
    (callback: (items: FileType[]) => void, query?: Record<string, any>) =>
      fetchItems(query).then(
        ({ data: { browser_items: items } }: { data: { browser_items: FileType[] } }) =>
          callback(items),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!initiatedRef?.current) {
      const initializeManager = async () => {
        initiatedRef.current = true;

        const mod = await import('./Manager');
        const Manager = mod.Manager;
        managerRef.current = Manager.getInstance(uuid);

        await managerRef.current.initialize(resource, {
          ...opts,
          languageServer: {
            onComplete: () => {
              setCompletions(prev => ({ ...prev, languageServer: true }));
            },
          },
          workspace: {
            onComplete: () => {
              setCompletions(prev => ({ ...prev, workspace: true }));
            },
            options: {
              fetch,
            },
          },
          wrapper: {
            ...opts?.wrapper?.options,
            onComplete: () => {
              setCompletions(prev => ({ ...prev, wrapper: true }));

              if (opts?.wrapper?.onComplete) {
                opts?.wrapper?.onComplete?.();
              }
            },
          },
        });
      };

      initializeManager();
    }

    return () => {
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (managerRef?.current && !manager && Object.values(completions).every(v => v)) {
      setManager(managerRef?.current);
    }
  }, [completions, manager]);

  return manager;
}

export default useManager;
