import { useCallback, useMemo, useRef } from 'react';

import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import api from '@api';
import { getPageHistoryAsItems, getSearchHistory } from './utils';
import { onSuccess } from '@api/utils/response';

export default function useCache({
  onErrorCallback,
  onSuccessCallback,
  searchRef,
}) {
  const timeout = useRef(null);
  const router = useRouter();

  const [fetch, { isLoading }] = useMutation(
    () => api.command_center_items.useCreate()({
      command_center_item: {
        component: null,
        page: {
          as_path: router?.asPath,
          pathname: router?.pathname,
          query: router?.query,
        },
        page_history: getPageHistoryAsItems(),
        search: searchRef?.current?.value,
        search_history: getSearchHistory(),
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: onSuccessCallback,
          onErrorCallback,
        },
      ),
    },
  );

  const fetchDelay = useCallback((delay: number = 0) => {
    clearTimeout(timeout.current);

    return new Promise((resolve) => {
      timeout.current = setTimeout(() => resolve(fetch()), delay);
    });
  }, [fetch]);

  return {
    fetch: fetchDelay,
    isLoading,
  };
}
