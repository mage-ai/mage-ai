import { useCallback, useRef } from 'react';

import { AppLoaderProps } from '../../interfaces';
import { FileType, ResourceType } from '@components/v2/IDE/interfaces';

export type ToolbarsType = {
  resource: ResourceType;
  stale: boolean;
  updateLocalContent: (file: FileType) => void;
  updateServerContent: (
    event: MouseEvent,
    file: FileType,
    payload: {
      content?: string;
      path?: string;
    },
    opts?: any,
  ) => void;
} & AppLoaderProps;

export default function useToolbars({
  resource,
  stale,
  updateLocalContent,
  updateServerContent,
}: ToolbarsType) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { main, original } = resource;

  const saveCurrentContent = useCallback(
    (event: MouseEvent, opts?: any) => {
      updateServerContent(event, main, {
        path: inputRef?.current?.value || main?.path,
      }, opts);
    },
    [main, updateServerContent],
  );

  const overrideServerContentFromLocal = useCallback(
    (event: MouseEvent) => updateServerContent(event, main, main),
    [main, updateServerContent],
  );

  const overrideLocalContentFromServer = useCallback(
    () => updateLocalContent(original),
    [original, updateLocalContent],
  );

  return {
    inputRef,
    main,
    original,
    overrideLocalContentFromServer,
    overrideServerContentFromLocal,
    saveCurrentContent,
    stale,
  };
}
