import { useCallback, useMemo } from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, COMMON_EXCLUDE_PATTERNS } from '@interfaces/FileType';
import { ApiHookType } from '../interfaces';
import { updateFileCache } from '@components/v2/IDE/cache';

export default function useItems(): ApiHookType {
  const [listMutation, { isLoading: listLoading }] = useMutation(
    (query?: {
      _limit?: number;
      _offset?: number;
      directory?: string;
      exclude_pattern?: string | RegExp;
      include_pattern?: string | RegExp;
    }) =>
      api.browser_items.listAsync({
        exclude_pattern: COMMON_EXCLUDE_PATTERNS,
        include_pattern: encodeURIComponent(String(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX)),
        ...query,
      }),
  );

  const [detailMutation, { isLoading: detailLoading }] = useMutation((path: string) =>
    api.browser_items.detailAsync(encodeURIComponent(path)),
  );

  const [createMutation, { isLoading: createLoading }] = useMutation(
    (payload: { content: string; path: string }) =>
      api.browser_items.useCreate()({ browser_item: payload }),
  );

  const [updateMutation, { isLoading: updateLoading }] = useMutation(
    (opts: {
      uuid: string;
      payload: {
        content: string;
        path: string;
      };
    }) =>
      api.browser_items.useUpdate(encodeURIComponent(opts?.uuid))({ browser_item: opts?.payload }),
  );

  const [deleteMutation, { isLoading: deleteLoading }] = useMutation((path: string) =>
    api.browser_items.useDelete(encodeURIComponent(path)),
  );

  // eslint-disable-next-line
  const list = useCallback((query: any) => listMutation(query), []);
  // eslint-disable-next-line
  const detail = useCallback((path: any) => detailMutation(path), []);
  // eslint-disable-next-line
  const create = useCallback((payload: any) => createMutation(payload), []);
  const update = useCallback((uuid: string, payload: any) => updateMutation({
    payload,
    uuid,
  }).then(({ data: { browser_item: item } }) => {
    updateFileCache({
      client: item,
      server: item,
    });

    return new Promise(resolve => resolve(item));
    // eslint-disable-next-line
  }), []);
  // eslint-disable-next-line
  const deleteRequest = useCallback((path: any) => deleteMutation(path), []);

  const loading = useMemo(() => ({
    create: createLoading,
    delete: deleteLoading,
    detail: detailLoading,
    list: listLoading,
    update: updateLoading,
  }), [
    createLoading,
    deleteLoading,
    detailLoading,
    listLoading,
    updateLoading,
  ]);

  return {
    api: {
      create,
      delete: deleteRequest,
      detail,
      list,
      update,
    },

    loading,
  };
}
