import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import useToolbarsHook from './Toolbars/useToolbars';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';
import { FileCacheType, getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { FileType } from '../../IDE/interfaces';
import { MutateType } from '@api/interfaces';
import { useMutate } from '@context/APIMutation';

const ToolbarsTop = dynamic(() => import('./Toolbars/Top'));
const MaterialIDE = dynamic(() => import('@components/v2/IDE'), {
  ssr: false,
});

export default function useApp(props: AppLoaderProps & {
  editor?: {
    containerClassName?: string;
    editorClassName?: string;
    style?: React.CSSProperties;
  },
  skipInitialFetch?: boolean;
  useToolbars?: boolean;
}): AppLoaderResultType & {
  mutate: MutateType;
} {
  const { app, editor, skipInitialFetch, useToolbars } = props;

  if (!app?.uuid) {
    console.error('App UUID is required.');
  }

  const file = useMemo(() => app?.options?.file, [app]);
  const { client, server } = useMemo(
    () => getFileCache(file?.path) || ({} as FileCacheType),
    [file],
  );

  const [main, setMainState] = useState<FileType>({
    ...file,
    ...(client?.file || {}),
  });

  const [original, setOriginal] = useState<FileType>(server?.file);
  const [stale, setStale] = useState(isStale(file?.path));

  const contentRef = useRef(main?.content || '');
  const clientRef = useRef(client?.file);
  const phaseRef = useRef(0);

  async function updateLocalContent(item: FileType) {
    await import('../../IDE/Manager').then(mod => {
      if (!item) {
        console.log('No item to update.', item);
        return;
      }

      mod.Manager.setValue(item);
      updateFileCache({ client: item, server: item });
      // Trigger state update so the toolbar statuses re-render.
      setMainState(item);
      setStale(isStale(item.path));
    });
  }

  const mutants = useMutate({
    resource: 'browser_items',
  }, {
    handlers: {
      detail: {
        onSuccess: (item: FileType) => {
          setOriginal(item);

          let staleUpdated = false;
          if (clientRef.current) {
            // If cache exists client side, don’t update it; only update the server cache.
            updateFileCache({ server: item });
          } else {
            // If cache doesn’t exist client side, set it. This is done typically when the file
            // is opened for the very first time.
            updateLocalContent(item);
            staleUpdated = true;
          }

          setMainState(item);

          if (item) {
            contentRef.current = item.content;
            !staleUpdated && setStale(isStale(item.path));
          }
          phaseRef.current += 1;
        },
      },
      update: {
        onSuccess: (item: FileType) => {
          updateFileCache({ server: item });
          setMainState(item);

          if (item) {
            contentRef.current = item.content;
            setStale(isStale(item.path));
          }
          phaseRef.current += 1;
        },
      },
    },
  });

  function updateServerContent(
    event: MouseEvent,
    item: FileType,
    payload: {
      content?: string;
      path?: string;
    },
  ) {
    mutants.update.mutate({
      event,
      id: item.path,
      payload: {
        content: payload?.content || contentRef?.current,
        path: payload?.path || item.path,
      },
    });
  }

  useEffect(() => {
    const path = file?.path;
    if (phaseRef.current === 0 && path && !skipInitialFetch) {
      mutants.detail.mutate({
        id: path,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, file, skipInitialFetch]);

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
    () =>
      (clientRef?.current || main?.content || phaseRef.current >= 1) && (
        <MaterialIDE
          {...editor}
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

  const {
    inputRef,
    overrideLocalContentFromServer,
    overrideServerContentFromLocal,
    saveCurrentContent,
  } = useToolbarsHook({
    ...props,
    resource: {
      main,
      original,
    },
    stale,
    updateLocalContent,
    updateServerContent,
  });

  const top = useMemo(
    () => !useToolbars && (
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
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutants.update.isLoading, main, original, props, stale, useToolbars],
  );

  return {
    main: mainApp,
    mutate: mutants,
    toolbars: useToolbars
      ? {
        inputRef,
        main,
        original,
        overrideLocalContentFromServer,
        overrideServerContentFromLocal,
        saveCurrentContent,
        stale,
      }
      : { top },
  };
}
