import { useMemo } from 'react';
// https://tanstack.com/query/v4/docs/framework/react/reference/useMutation
import { useMutation } from '@tanstack/react-query';

import api from '@api';
import {
  HandlersType,
  MutateFunctionArgsType,
  MutateType,
  ResponseType,
  ResourceHandlersType,
} from './interfaces';
import { OperationTypeEnum } from './constants';
import { dig } from '@utils/hash';
import { singularize } from '@utils/string';

export default function useMutate(
  endpoint: string | string[],
  opts?: {
    handlers?: ResourceHandlersType;
    parse?: string | ((...args: any[]) => any);
  },
): MutateType {
  const apiEndpoint = dig(api, endpoint);
  const { handlers: resourceHandlers, parse } = opts || {};

  const arr = typeof endpoint === 'string' ? endpoint.split('.') : endpoint;
  const resourceNamePlural = arr[arr.length - 1];
  const resourceName: string = singularize(resourceNamePlural) as string;
  const isChildResource: boolean = arr?.length >= 2;

  function resourceKey(operation?: OperationTypeEnum): string {
    return operation && OperationTypeEnum.LIST === operation ? resourceNamePlural : resourceName;
  }

  function preprocessPayload(payload: any): {
    [key: typeof resourceName]: any;
  } {
    return {
      [resourceName]: payload,
    };
  }

  function augmentHandlers(operation: OperationTypeEnum, handlers?: HandlersType) {
    const { onError, onSuccess } = handlers || ({} as HandlersType);
    return {
      ...(handlers || {}),
      onError: (error: any, variables: any, context?: any) => {
        alert(`${JSON.stringify(error)}`);

        onError && onError?.(error, variables, context);
      },
      onSuccess: (response: ResponseType, variables: any, context?: any) => {
        const { data } = response || ({} as ResponseType);

        onSuccess &&
          onSuccess?.(
            typeof parse === 'function' ? parse(data) : data?.[resourceKey(operation)],
            variables,
            context,
          );
      },
    };
  }

  function addMetaQuery(query: any): any {
    return {
      ...(query || {}),
      _http_error_codes: true,
    };
  }

  const fnCreate = useMutation({
    ...augmentHandlers(OperationTypeEnum.CREATE, resourceHandlers?.create || {}),
    mutationFn: (args?: MutateFunctionArgsType) =>
      apiEndpoint.create(
        ...(Array.isArray(args?.id) ? args?.id : [args?.id]),
        addMetaQuery(args?.query || {}),
      )(preprocessPayload(args?.payload || {})),
  });
  const fnDelete = useMutation({
    ...augmentHandlers(OperationTypeEnum.DELETE, resourceHandlers?.delete || {}),
    mutationFn: (args?: MutateFunctionArgsType) =>
      apiEndpoint.useDelete(
        ...(Array.isArray(args?.id) ? args?.id : [args?.id]),
        addMetaQuery(args?.query || {}),
      ),
  });
  const fnDetail = useMutation({
    ...augmentHandlers(OperationTypeEnum.DETAIL, resourceHandlers?.detail || {}),
    mutationFn: (args?: MutateFunctionArgsType) =>
      apiEndpoint.detailAsync(
        ...(Array.isArray(args?.id) ? args?.id : [args?.id]),
        addMetaQuery(args?.query || {}),
      ),
  });
  const fnList = useMutation({
    ...augmentHandlers(OperationTypeEnum.LIST, resourceHandlers?.list || {}),
    mutationFn: (args?: MutateFunctionArgsType) =>
      apiEndpoint.listAsync(
        ...[
          ...(isChildResource ? (Array.isArray(args?.id) ? args?.id : [args?.id]) : []),
          addMetaQuery(args?.query || {}),
        ],
      ),
  });
  const fnUpdate = useMutation({
    ...augmentHandlers(OperationTypeEnum.UPDATE, resourceHandlers?.update || {}),
    mutationFn: (args?: MutateFunctionArgsType) =>
      apiEndpoint.useUpdate(
        ...(Array.isArray(args?.id) ? args?.id : [args?.id]),
        addMetaQuery(args?.query || {}),
      )(preprocessPayload(args?.payload || {})),
  });

  const mutationCreate = useMemo(() => fnCreate, [fnCreate]);
  const mutationDelete = useMemo(() => fnDelete, [fnDelete]);
  const mutationDetail = useMemo(() => fnDetail, [fnDetail]);
  const mutationList = useMemo(() => fnList, [fnList]);
  const mutationUpdate = useMemo(() => fnUpdate, [fnUpdate]);

  // @ts-ignore
  return {
    create: mutationCreate,
    delete: mutationDelete,
    detail: mutationDetail,
    list: mutationList,
    update: mutationUpdate,
  } as MutateType;
}
