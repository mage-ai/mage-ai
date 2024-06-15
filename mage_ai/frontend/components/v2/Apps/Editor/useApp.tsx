import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import { AppLoaderProps, AppLoaderResultType } from '../interfaces';
import useItems from '../hooks/items/useItems';
import { FileCacheType, getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { FileType } from '../../IDE/interfaces';
import { handleResponse } from '@api/callbacks';

const ToolbarsTop = dynamic(() => import('./Toolbars/Top'));
const MaterialIDE = dynamic(() => import('@components/v2/IDE'), {
  ssr: false,
});

async function updateLocalContent(item: FileType) {
  await import('../../IDE/Manager').then((mod) => {
    mod.Manager.setValue(item);

    updateFileCache({ client: item, server: item });
  });
}

export default function useApp(props: AppLoaderProps): AppLoaderResultType {
  const { app } = props;
  const { api, loading } = useItems();

  const file = useMemo(() => app?.options?.file, [app]);
  const {
    client,
    server,
  } = useMemo(() => getFileCache(file?.path) || {} as FileCacheType, [file]);

  const [main, setMainState] = useState<FileType>({
    ...file,
    ...(client?.file || {}),
  });

  const contentRef = useRef(main?.content || '');
  const clientRef = useRef(client?.file);
  const phaseRef = useRef(0);

  function setMain(item: FileType) {
    if (clientRef.current) {
      updateFileCache({ server: item });
    } else {
      setMainState(item);
      updateLocalContent(item);
    }

    if (item) {
      contentRef.current = item.content;
      setStale(isStale(item.path));
    }

    phaseRef.current += 1;
  }

  function updateServerContent(item: FileType, payload: {
    content?: string;
    path?: string;
  }) {
    api.update(item.path, {
      content: contentRef?.current,
      path: item.path,
      ...payload,
    }, handleResponse({
      onSuccess: setMain,
    }));
  }

  const [original, setOriginal] = useState<FileType>(server?.file);
  const [stale, setStale] = useState(isStale(file?.path));

  useEffect(() => {
    const path = file?.path;
    if (phaseRef.current === 0 && path) {
      api.detail(encodeURIComponent(path), handleResponse({
        onSuccess: (item: FileType) => {
          setMain(item);
          setOriginal(item);
        },
        parse: 'browser_item',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, file]);

  function onDidChangeModelContent(editor: any, _event: any) {
    const model = editor.getModel();
    const content = model.getValue();
    const path = model.uri.path;

    contentRef.current = content;
    updateFileCache({
      client: {
        content: contentRef.current,
        path,
      },
    });
  }

  const mainApp = useMemo(
    () => (clientRef?.current || main?.content || phaseRef.current >= 1) && (
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, main],
  );

  const top = useMemo(() => (
    <ToolbarsTop
      {...props}
      loading={loading?.update}
      resource={{
        main,
        original,
      }}
      stale={stale}
      updateLocalContent={updateLocalContent}
      updateServerContent={updateServerContent}
    />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [loading, main, original, props, stale]);

  return {
    main: mainApp,
    toolbars: {
      top,
    },
  };
}
