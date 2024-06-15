import { useMutate } from '@tanstack/react-query';

import { FileType } from '@components/v2/IDE/interfaces';
import { HandlersType } from '@api/callbacks';
import { updateFileCache } from '@components/v2/IDE/cache';

export default function useItems() {
  const {
    api,
    loading,
  } = useMutate('browser_items');

  return {
    api: {
      ...api,
      update: (args: [], handlers: HandlersType) => api.update(...args, {
        ...handlers,
        onSuccess: (resource: FileType) => {
          updateFileCache({
            client: resource,
            server: resource,
          });

          return handlers?.onSuccess?.(resource);
        },
      }),
    },
    loading,
  };
}
