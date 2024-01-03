import { useCallback, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import api from '@api';
import {
  CommandCenterItemType,
  ItemApplicationType,
  KeyValueType,
} from '@interfaces/CommandCenterType';
import { getCachedItems } from './cache';
import { getCurrentMode, getPageHistoryAsItems, getPicksHistory, getSearchHistory } from './utils';
import { onSuccess } from '@api/utils/response';

export default function useCache(fetchUUID: () => number | string, opts: {
  abortControllerRef: any;
  onErrorCallback?: (resp: any, err: {
    code: number;
    messages: string[];
  }) => void;
  onSuccessCallback?: (response: any, opts: any) => void;
  searchRef: any;
} = {
  abortControllerRef: null,
  onErrorCallback: null,
  onSuccessCallback: null,
  searchRef: null,
}): {
  fetch: (opts?: {
    application?: ItemApplicationType;
    delay?: number;
    disableRenderingCache?: boolean;
    item?: CommandCenterItemType;
    results?: KeyValueType;
    search?: string;
    uuid?: number | string;
  }) => Promise<any>;
  isLoading: boolean;
} {
  const {
    abortControllerRef,
    onErrorCallback,
    onSuccessCallback,
    searchRef,
  } = opts || {
    abortControllerRef: null,
    onErrorCallback: null,
    onSuccessCallback: null,
    searchRef: null,
  };

  const timeout = useRef(null);
  const router = useRouter();

  const [fetch, { isLoading }] = useMutation(
    ({
      application,
      item,
      results,
      search,
    }: {
      application?: ItemApplicationType;
      delay?: number;
      disableRenderingCache?: boolean;
      item?: CommandCenterItemType;
      search?: string;
      uuid?: number | string;
    }) => api.command_center_items.useCreate({
      signal: abortControllerRef?.current?.signal,
    })({
      command_center_item: {
        application,
        component: null,
        item,
        mode: getCurrentMode(),
        page: {
          path: router?.asPath,
          pathname: router?.pathname,
          query: router?.query,
          title: typeof document !== 'undefined' ? document?.title : null,
        },
        page_history: getPageHistoryAsItems(),
        picks: getPicksHistory(),
        results,
        search: typeof search === 'undefined' ? searchRef?.current?.value : search,
        search_history: getSearchHistory(),
      },
    }),
    {
      onSuccess: (
        response: any,
        variables: {
          disableRenderingCache?: boolean;
          uuid: number | string;
        },
      ) => onSuccess(
        response, {
          callback: resp => onSuccessCallback(
            resp,
            variables,
          ),
          onErrorCallback,
        },
      ),
    },
  );

  const fetchDelay = useCallback((opts: {
    application?: ItemApplicationType;
    delay?: number;
    disableRenderingCache?: boolean;
    item?: CommandCenterItemType;
    results?: KeyValueType;
    search?: string;
    uuid?: number | string;
  } = {}) => {
    const {
      delay,
    } = opts || {
      delay: 0,
    };

    clearTimeout(timeout.current);

    return new Promise((resolve) => {
      timeout.current = setTimeout(() => {
        const uuid = fetchUUID();
        if (abortControllerRef?.current !== null) {
          abortControllerRef?.current?.abort();
        }
        abortControllerRef.current = new AbortController();

        console.log('WTFFFFFFFFFFFFFFFFFFFFFFFF1', opts)

        return resolve(fetch({
          ...opts,
          uuid,
        }));
      }, delay);
    });
  }, [fetch, fetchUUID]);

  return {
    fetch: fetchDelay,
    isLoading,
  };
}
