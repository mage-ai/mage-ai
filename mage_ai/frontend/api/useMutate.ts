import { useMemo } from 'react';
// https://tanstack.com/query/v4/docs/framework/react/reference/useMutation
import { useMutation } from '@tanstack/react-query';

import api from '@api';
import { HandlersType, MutateType, ResponseType, ResourceHandlersType } from './interfaces';
import { OperationTypeEnum } from './constants';
import { dig } from '@utils/hash';
import { singularize } from '@utils/string';

export default function useMutate(endpoint: string | string[], opts?: {
  handlers?: ResourceHandlersType;
  parse?: string | ((...args: any[]) => any);
}): MutateType {
  const apiEndpoint = dig(api, endpoint);
  const { handlers: resourceHandlers, parse } = opts || {};

  function augmentHandlers(operation: OperationTypeEnum, handlers?: HandlersType) {
    const { onError, onSuccess } = handlers || {} as HandlersType;
    return {
      ...(handlers || {}),
      onError: (error: any, variables: any, context?: any) => {
        console.log('[ERROR]', error);


        onError && onError?.(error, variables, context);
      },
      onSuccess: (response: ResponseType, variables: any, context?: any) => {
        const { data } = response || {} as ResponseType;
        const arr = typeof endpoint === 'string' ? endpoint.split('.') : endpoint;
        const resourceName = arr[arr.length - 1];
        const resource = OperationTypeEnum.LIST === operation ? resourceName : singularize(resourceName);

        onSuccess && onSuccess?.(
          typeof parse === 'function' ? parse(data) : data?.[resource],
          variables,
          context,
        );
      },
    };
  }

  const fnList = useMutation({
    ...augmentHandlers(OperationTypeEnum.LIST, resourceHandlers?.list || {}),
    mutationFn: (args?: any | any[]) => apiEndpoint.listAsync(...(Array.isArray(args) ? args : [args])),
  });
  const fnCreate = useMutation({
    ...augmentHandlers(OperationTypeEnum.CREATE, resourceHandlers?.create || {}),
    mutationFn: (args?: any | any[]) => apiEndpoint.create(...(Array.isArray(args) ? args : [args])),
  });
  const fnDetail = useMutation({
    ...augmentHandlers(OperationTypeEnum.DETAIL, resourceHandlers?.detail || {}),
    mutationFn: (args?: any | any[]) => apiEndpoint.detailAsync(...(Array.isArray(args) ? args : [args])),
  });
  const fnDelete = useMutation({
    ...augmentHandlers(OperationTypeEnum.DELETE, resourceHandlers?.delete || {}),
    mutationFn: (args?: any | any[]) => apiEndpoint.useDelete(...(Array.isArray(args) ? args : [args])),
  });
  const fnUpdate = useMutation({
    ...augmentHandlers(OperationTypeEnum.UPDATE, resourceHandlers?.update || {}),
    mutationFn: (args?: any | any[]) => apiEndpoint.useUpdate(...(Array.isArray(args) ? args : [args])),
  });

  const mutationCreate = useMemo(() => fnCreate, [fnCreate]);
  const mutationDelete = useMemo(() => fnDelete, [fnDelete]);
  const mutationDetail = useMemo(() => fnDetail, [fnDetail]);
  const mutationList = useMemo(() => fnList, [fnList]);
  const mutationUpdate = useMemo(() => fnUpdate, [fnUpdate]);

  return {
    create: mutationCreate,
    delete: mutationDelete,
    detail: mutationDetail,
    list: mutationList,
    update: mutationUpdate,
  } as MutateType;
}
