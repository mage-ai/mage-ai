import useMutate from '@api/useMutate';
import { FileType } from '@components/v2/IDE/interfaces';
import { ResourceHandlersType } from '@api/interfaces';
import { updateFileCache } from '@components/v2/IDE/cache';
import { mergeDeep } from '@utils/hash';

export default function useItems(resourceHandlers?: ResourceHandlersType) {
  const mutants = useMutate('browser_items', {
    handlers: mergeDeep(resourceHandlers, {
      update: {
        onSuccess: (resource: FileType, ...successArgs: any[]) => {
          updateFileCache({
            client: resource,
            server: resource,
          });

          resourceHandlers?.update?.onSuccess
            && resourceHandlers?.update?.onSuccess?.(resource, ...(successArgs as [any]));
        },
      },
    }),
  });

  return mutants;
}
