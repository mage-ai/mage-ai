import { useCallback, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import api from '@api';
import { getCachedItems } from './cache';
import { getPageHistoryAsItems, getSearchHistory } from './utils';
import { onSuccess } from '@api/utils/response';

export default function useCache(fetchUUID: () => number | string, opts: {
  onErrorCallback?: (resp: any, err: {
    code: number;
    messages: string[];
  }) => void;
  onSuccessCallback?: (response: any, opts: any) => Promise<any>;
  searchRef: any;
} = {}): {
  fetch: (delay?: number) => Promise<any>;
  isLoading: boolean;
} {
  const {
    onErrorCallback,
    onSuccessCallback,
    searchRef,
  } = opts || {
    onErrorCallback: null,
    onSuccessCallback: null,
    searchRef: null,
  };

  const timeout = useRef(null);
  const router = useRouter();

  const [fetch, { isLoading }] = useMutation(
    (uuid?: number | string) => api.command_center_items.useCreate()({
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
      onSuccess: (response: any, uuid: number | string) => onSuccess(
        response, {
          callback: resp => onSuccessCallback(resp, uuid),
          onErrorCallback,
        },
      ),
    },
  );

  const fetchDelay = useCallback((delay: number = 0) => {
    clearTimeout(timeout.current);

    return new Promise((resolve) => {
      timeout.current = setTimeout(() => {
        const uuid = fetchUUID();

        return resolve(fetch(uuid));
      }, delay);
    });
  }, [fetch, fetchUUID]);

  return {
    fetch: fetchDelay,
    isLoading,
  };
}
