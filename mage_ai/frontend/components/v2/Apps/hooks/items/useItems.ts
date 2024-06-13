import { useMutation } from 'react-query';

import api from '@api';
import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, COMMON_EXCLUDE_PATTERNS } from '@interfaces/FileType';

export default function useItems() {
  const [list, { isLoading: listLoading }] = useMutation(
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

  const [detail, { isLoading: detailLoading }] = useMutation((path: string) =>
    api.browser_items.detailAsync(encodeURIComponent(path))(),
  );

  const [create, { isLoading: createLoading }] = useMutation(
    (payload: { content: string; path: string }) =>
      api.browser_items.useCreate()({ browser_item: payload }),
  );

  const [update, { isLoading: updateLoading }] = useMutation(
    (opts: {
      path: string;
      payload: {
        content: string;
        path: string;
      };
    }) =>
      api.browser_items.useUpdate(encodeURIComponent(opts?.path))({ browser_item: opts?.payload }),
  );

  const [deleteItem, { isLoading: deleteLoading }] = useMutation((path: string) =>
    api.browser_items.useDelete(encodeURIComponent(path)),
  );

  return {
    create,
    createLoading,
    deleteItem,
    deleteLoading,
    detail,
    detailLoading,
    list,
    listLoading,
    update,
    updateLoading,
  };
}
