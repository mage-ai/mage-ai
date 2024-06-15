import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import api from '@api';
import { ApiHookType } from './interfaces';
import { HandlersType } from './callbacks';
import { dig } from '@utils/hash';
import { singularize } from '@utils/string';

export default function useMutate(endpoint: string | string[], {
  parse,
}: {
  parse?: string | ((...args: any[]) => any);
}): ApiHookType {
  const apiEndpoint = dig(api, endpoint);
  const fnList = useMutation({ mutationFn: (args?: any[], query?: any) => apiEndpoint.listAsync(...args, query) });
  const fnCreate = useMutation({ mutationFn: (args: any) => apiEndpoint.useCreate()(args) });
  const fnDetail = useMutation({ mutationFn: (args: any[], query?: any) => apiEndpoint.detailAsync(...args, query) });
  const fnDelete = useMutation({ mutationFn: (args: any[]) => apiEndpoint.useDelete(...args) });
  const fnUpdate = useMutation({ mutationFn: (args: any[], payload: any) => apiEndpoint.useUpdate(...args)(payload) });

  const mutations = useMemo(() => ({
    create: fnCreate,
    delete: fnDelete,
    detail: fnDetail,
    list: fnList,
    update: fnUpdate,
  }), [
    fnCreate,
    fnDelete,
    fnDetail,
    fnList,
    fnUpdate,
  ]);

  return Object.entries(mutations).reduce((acc, [key, {
    isPending,
    mutate,
  }]) => ({
    ...acc,
    api: {
      ...(acc?.api || {}),
      [key]: (args: any[], handlers?: HandlersType) => mutate(...args, {
        ...handlers,
        onSuccess: (...args: any[]) => {
          const arr = typeof endpoint === 'string' ? endpoint.split('.') : endpoint;
          const key = arr[arr.length - 1];
          const resource = key === 'list' ? key : singularize(key);

          const argsParsed = [
            typeof parse === 'function' ? parse(arr[0]) : dig(arr[0], resource),
            ...args.slice(1, args?.length),
          ];

          handlers?.onSuccess?.(...argsParsed);
        },
      }),
    },
    loading: {
      ...(acc?.loading || {}),
      [key]: isPending,
    },
  }), {
    api: {},
    loading: {},
  });
}
