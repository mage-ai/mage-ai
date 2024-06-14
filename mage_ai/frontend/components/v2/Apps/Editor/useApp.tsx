import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import { AppLoaderProps, AppLoaderResultType } from '../interfaces';
import useItems from '../hooks/items/useItems';
import { FileCacheType, getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { FileType } from '../../IDE/interfaces';

const ToolbarsTop = dynamic(() => import('./Toolbars/Top'));
const MaterialIDE = dynamic(() => import('@components/v2/IDE'), {
  ssr: false,
});

export default function useApp(props: AppLoaderProps): AppLoaderResultType {
  const phaseRef = useRef(0);

  const { app } = props;
  const file = useMemo(() => app?.options?.file, [app]);
  const { client, server } = useMemo(() => getFileCache(file?.path) || {} as FileCacheType, [file]);

  const [main, setMain] = useState<FileType>(client?.file);
  const [, setOriginal] = useState<FileType>(server?.file);

  const { api, loading } = useItems();

  useEffect(() => {
    const path = file?.path;
    if (phaseRef.current === 0 && path && (!client || isStale(path))) {
      api
        .detail(encodeURIComponent(path))
        .then(({ data: { browser_item: item } }) => {
          setOriginal(item);
          setMain((prev) => {
            updateFileCache({
              ...(prev ? {} : { client: item }),
              server: item,
            });

            return prev ? prev : item;
          });
          phaseRef.current = 1;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, file]);

  function onDidChangeModelContent(editor: any, _event: any) {
    const model = editor.getModel();
    const content = model.getValue();
    const path = model.uri.path;

    updateFileCache({
      client: {
        content,
        path,
      },
    });
  }

  const mainApp = useMemo(
    () => main && (
      <MaterialIDE
        configurations={app?.options?.configurations}
        eventListeners={{
          onDidChangeModelContent,
        }}
        persistManagerOnUnmount
        resource={{
          main,
          // Diff editor doesn’t show diff colors yet, don’t use it for now.
          // original,
        }}
        uuid={app?.uuid}
      />
    ),
    [app, main],
  );

  const top = useMemo(() => (
    <ToolbarsTop {...props} />
  ), [props]);

  return {
    main: mainApp,
    toolbars: {
      top,
    },
  };
}
