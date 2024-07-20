import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import useToolbarsHook from './Toolbars/useToolbars';
import { AppLoaderProps, AppLoaderResultType } from '../interfaces';
import { FileCacheType, getFileCache, isStale, updateFileCache } from '../../IDE/cache';
import { FileType, IDEProps } from '../../IDE/interfaces';
import { MutateType } from '@api/interfaces';
import { useMutate } from '@context/v2/APIMutation';
import { DEBUG } from '@components/v2/utils/debug';

const ToolbarsTop = dynamic(() => import('./Toolbars/Top'));
const MaterialIDE = dynamic(() => import('@components/v2/IDE'), {
  ssr: false,
});

export default function useApp(
  props: AppLoaderProps & {
    editor?: IDEProps;
    onMountEditor?: (editor: any) => void;
    skipInitialFetch?: boolean;
    useToolbars?: boolean;
  },
): {
  editor: {
    getValue: () => string;
  };
  mutate: MutateType;
} & AppLoaderResultType {
  const contentRef = useRef<string>(null);
  const editorRef = useRef<any>(null);

  const { app, editor, onMountEditor, skipInitialFetch, useToolbars } = props;

  if (!app?.uuid) {
    console.error('App UUID is required.');
  }

  const file = useMemo(() => app?.options?.file, [app]);
  const { client, server } = useMemo(
    () => getFileCache(file?.path) || ({} as FileCacheType),
    [file],
  );
  if (contentRef.current === null) {
    contentRef.current = client?.file?.content;
  }

  const [main, setMainState] = useState<FileType>({
    ...file,
    ...(client?.file || {}),
  });

  const [original, setOriginal] = useState<FileType>(server?.file);
  const [stale, setStale] = useState(isStale(file?.path));

  const clientRef = useRef(client?.file);
  const phaseRef = useRef(0);

  function getContent(): string {
    return editorRef?.current?.getModel()?.getValue();
  }

  function getPath(): string {
    const model = editorRef?.current?.getModel();
    const path = model.uri.path;
    return path;
  }

  function updateLocalCache() {
    updateFileCache({
      client: {
        content: getContent(),
        path: getPath(),
      },
    });
  }

  function setContent(value: string) {
    editorRef?.current?.setValue(value);
    updateLocalCache();
  }

  function onDidChangeModelContent() {
    updateLocalCache();
  }

  async function updateLocalContent(item: FileType) {
    DEBUG.editor.app && console.log('updateLocalContent', item);

    if (!item) {
      DEBUG.editor.app && console.log('No item to update.', item);
      return;
    }

    if (editorRef?.current) {
      setContent(item.content);
    } else {
      await import('../../IDE/Manager').then(mod => {
        mod.Manager.setValue(item);
      });
    }

    updateFileCache({ client: item, server: item });
    // Trigger state update so the toolbar statuses re-render.
    setMainState(item);
    setStale(isStale(item.path));
  }

  const mutants = useMutate(
    {
      resource: 'browser_items',
    },
    {
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

            if (!client?.file) {
              setMainState(item);
            }

            if (item) {
              // If it already exists, don’t update it.
              if (contentRef?.current === null) {
                contentRef.current = item.content;
                editorRef?.current?.setValue?.(contentRef.current);
              }
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
              if (contentRef?.current === null) {
                contentRef.current = item.content;
                editorRef?.current?.setValue?.(contentRef.current);
              }
              setStale(isStale(item.path));
            }
            phaseRef.current += 1;
          },
        },
      },
    },
  );

  function overrideServerContentFromLocal(event: MouseEvent) {
    updateServerContent(event, main, {
      content: getContent(),
      path: getPath(),
    });
  }

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
        content: payload?.content || getContent(),
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

  const mainApp = useMemo(
    () =>
      (clientRef?.current || main?.content || phaseRef.current >= 1) && (
        <MaterialIDE
          {...editor}
          configurations={app?.options?.configurations}
          eventListeners={{
            onDidChangeModelContent,
            ...editor?.eventListeners,
          }}
          onMountEditor={(editor: any) => {
            editorRef.current = editor;
            onMountEditor && onMountEditor?.(editor);
          }}
          persistManagerOnUnmount
          persistResourceOnUnmount={editor?.persistResourceOnUnmount}
          resource={{
            main,
            // Diff editor doesn’t show diff colors yet, don’t use it for now.
            // original,
          }}
          uuid={app?.uuid}
        />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, main, editor, onMountEditor],
  );

  const { inputRef, overrideLocalContentFromServer, saveCurrentContent } = useToolbarsHook({
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
    () =>
      !useToolbars && (
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
    editor: {
      getValue: getContent,
    },
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
