import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import { AppLoaderProps, AppLoaderResultType } from '../interfaces';
import useMutate from '@api/useMutate';
import { FileCacheType, getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { FileType } from '../../IDE/interfaces';

const ToolbarsTop = dynamic(() => import('./Toolbars/Top'));
const MaterialIDE = dynamic(() => import('@components/v2/IDE'), {
  ssr: false,
});

async function updateLocalContent(item: FileType) {
  await import('../../IDE/Manager').then((mod) => {
    mod.Manager.setValue(item);
    console.log('cache');
    updateFileCache({ client: item, server: item });
  });
}

export default function useApp(props: AppLoaderProps): AppLoaderResultType {
  console.log('render');
  const { app } = props;

  const file = useMemo(() => app?.options?.file, [app]);
  const {
    client,
    server,
  } = useMemo(() => getFileCache(file?.path) || {} as FileCacheType, [file]);

  const [main, setMainState] = useState<FileType>({
    ...file,
    ...(client?.file || {}),
  });

  const [original, setOriginal] = useState<FileType>(server?.file);
  const [stale, setStale] = useState(isStale(file?.path));

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

  const mutants = useMutate('browser_items', {
    handlers: {
      detail: {
        onSuccess: (item: FileType) => {
          setMain(item);
          setOriginal(item);
        },
      },
      update: {
        onSuccess: (item: FileType) => {
          setMain(item);
        },
      },
    },
  });

  function updateServerContent(item: FileType, payload: {
    content?: string;
    path?: string;
  }) {
    mutants.update.mutate({
      id: encodeURIComponent(item.path),
      payload: {
        content: payload?.content || contentRef?.current,
        path: payload?.path || item.path,
      },
    });
  }

  useEffect(() => {
    const path = file?.path;
    if (phaseRef.current === 0 && path) {
      mutants.detail.mutate({
        id: encodeURIComponent(path),
      });
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
      loading={mutants.update.isLoading}
      resource={{
        main,
        original,
      }}
      stale={stale}
      updateLocalContent={updateLocalContent}
      updateServerContent={updateServerContent}
    />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [mutants.update.isLoading, main, original, props, stale]);

  return {
    main: mainApp,
    toolbars: {
      top,
    },
  };
}
