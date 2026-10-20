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
import { getCurrentlyOpenedApplications } from '@storage/ApplicationManager/cache';
import { onSuccess } from '@api/utils/response';
import { selectEntriesWithValues, selectKeys } from '@utils/hash';

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

  const requestRef = useRef(null);
  const responseRef = useRef(null);
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
      exclude?: string[];
      item?: CommandCenterItemType;
      refresh?: boolean;
      results?: KeyValueType;
      search?: string;
      uuid?: number | string;
    }) => api.command_center_items.useCreate({
      signal: abortControllerRef?.current?.signal,
    })({
      command_center_item: {
        state: selectEntriesWithValues({
          application,
          applications: getCurrentlyOpenedApplications(),
          component: null,
          item,
          mode: getCurrentMode(),
          page: {
            href: typeof window !== 'undefined' ? window.location.href : null,
            origin: typeof window !== 'undefined' ? window.location.origin : null,
            path: router?.asPath,
            pathname: router?.pathname,
            query: router?.query,
            title: typeof document !== 'undefined' ? document?.title : null,
          },
          results,
        }),
        timeline: selectEntriesWithValues({
          page_history: getPageHistoryAsItems(),
          picks: getPicksHistory(),
          search: typeof search === 'undefined' ? searchRef?.current?.value : search,
          search_history: getSearchHistory(),
        }),
      },
    }),
    {
      onSuccess: (
        response: any,
        variables: {
          disableRenderingCache?: boolean;
          exclude?: string[];
          refresh?: boolean;
          uuid: number | string;
        },
      ) => onSuccess(
        response, {
          callback: (resp) => {
            responseRef.current = resp;

            onSuccessCallback(resp, variables);
          },
          onErrorCallback,
        },
      ),
    },
  );

  const fetchDelay = useCallback((opts: {
    application?: ItemApplicationType;
    delay?: number;
    disableRenderingCache?: boolean;
    exclude?: string[];
    item?: CommandCenterItemType;
    refresh?: boolean;
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

        let request = {
          ...opts,
          uuid,
        };
        const prev = requestRef?.current;
        requestRef.current = request;

        if (opts?.refresh && requestRef?.current) {
          request = {
            ...prev,
            ...selectKeys(opts, [
              'exclude',
              'refresh',
            ]),
          };
        }

        return resolve(fetch(request));
      }, delay);
    });
  }, [fetch, fetchUUID]);

  return {
    fetch: fetchDelay,
    isLoading,
  };
}
