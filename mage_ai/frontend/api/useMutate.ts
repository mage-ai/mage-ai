// https://tanstack.com/query/v4/docs/framework/react/reference/useMutation
import { useMutation } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { hyphensToSnake } from '@utils/url';
import { isEqual } from '@utils/hash';

import api from '@api';
import {
  HandlersType,
  ModelsType,
  MutateFunctionArgsType,
  MutateType,
  MutationStatusMappingType,
  ResponseType,
  ResourceHandlersType,
  URLOptionsType,
} from './interfaces';
import { OperationTypeEnum } from './constants';
import { MutationStatusEnum as MutationStatusEnumBase } from './enums';
import { dig } from '@utils/hash';
import { singularize } from '@utils/string';

export const MutationStatusEnum = MutationStatusEnumBase;
export default function useMutate(
  endpoint: string | string[],
  opts?: {
    callbackOnEveryRequest?: boolean;
    throttle?: number;
    handlers?: ResourceHandlersType;
    parse?: string | ((...args: any[]) => any);
    urlParser?: URLOptionsType;
    subscribeToStatusUpdates?: boolean;
  },
): MutateType {
  const {
    callbackOnEveryRequest,
    subscribeToStatusUpdates,
    throttle = 1000,
  } = opts || {};
  const {
    disableEncodeURIComponent,
    disableHyphenCase,
  } = opts?.urlParser ?? {};

  const apiEndpoint = dig(api, endpoint);
  const { handlers: resourceHandlers, parse } = opts || {};

  const arr = typeof endpoint === 'string' ? endpoint.split('.') : endpoint;
  const resourceNamePlural = arr[0];
  const resourceName: string = singularize(resourceNamePlural) as string;
  const isChildResource: boolean = arr?.length >= 2;

  const checkpointRef = useRef<number>(null);
  const modelsRef = useRef<ModelsType>({
    [resourceName]: {},
    [resourceNamePlural]: [],
  });

  const statusRef = useRef<MutationStatusMappingType>({
    [OperationTypeEnum.CREATE]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.DELETE]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.DETAIL]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.LIST]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.UPDATE]: MutationStatusEnumBase.IDLE,
  });
  const [status, setStatus] = useState<MutationStatusMappingType>();

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
        console.error(error, `${JSON.stringify(error)}`);

        onError && onError?.(error, variables, context);

        handleStatusUpdate([error, variables, context]);
      },
      onSettled: (...args) => {
        handleStatusUpdate(args);
      },
      onSuccess: (response: ResponseType, variables: any, context?: any) => {
        const { data } = response || ({} as ResponseType);
        const key = resourceKey(operation);

        const res = data?.[key];
        const mod = modelsRef?.current?.[key];
        if (!callbackOnEveryRequest && res && mod && isEqual(res, mod)) {
          return;
        }

        if (data && key in data && (data?.[key] ?? false)) {
          modelsRef.current[key] = data[key];
        }

        onSuccess && onSuccess?.(
          typeof parse === 'function' ? parse(data) : data?.[resourceKey(operation)],
          variables,
          context,
        );

        handleStatusUpdate([response, variables, context]);
      },
    };
  }

  function addMetaQuery(query: any): any {
    return {
      ...(query || {}),
      _http_error_codes: true,
    };
  }

  function handleArgs(id?: string | string[]): string | string[] {
    const handlers = [
      (url: string) => disableHyphenCase ? url : hyphensToSnake(url),
      (url: string) => disableEncodeURIComponent ? url : encodeURIComponent(url),
    ];

    if (Array.isArray(id)) {
      return id.map((i) => handlers.reduce((acc, handler) => handler(acc), i));
    }

    return handlers.reduce((acc, handler) => handler(acc), id as string);
  }

  function preprocessArgs(args?: MutateFunctionArgsType): any | any[] {
    return (Array.isArray(args?.id) ? handleArgs(args?.id) : [args?.id]?.map(handleArgs));
  }

  function wrapMutation(args1: MutateFunctionArgsType, mutate: (args?: MutateFunctionArgsType) => any) {
    const now = Number(new Date());

    if (!checkpointRef?.current) {
      checkpointRef.current = now;
    } else if (now - checkpointRef.current < throttle) {
      return () => new Promise(() => null) ;
    }
    return mutate(args1);
  }

  const fnCreate = useMutation({
    ...augmentHandlers(OperationTypeEnum.CREATE, resourceHandlers?.create || {}),
    mutationFn: (args1?: MutateFunctionArgsType) => wrapMutation(args1, (args?: MutateFunctionArgsType) =>
      apiEndpoint.create(
        ...preprocessArgs(args),
        addMetaQuery(args?.query || {}),
      )(preprocessPayload(args?.payload || {}))),
  });
  const fnDelete = useMutation({
    ...augmentHandlers(OperationTypeEnum.DELETE, resourceHandlers?.delete || {}),
    mutationFn: (args1?: MutateFunctionArgsType) => wrapMutation(args1, (args?: MutateFunctionArgsType) =>
      apiEndpoint.useDelete(
        ...preprocessArgs(args),
        addMetaQuery(args?.query || {}),
      )),
  });
  const fnDetail = useMutation({
    ...augmentHandlers(OperationTypeEnum.DETAIL, resourceHandlers?.detail || {}),
    mutationFn: (args1?: MutateFunctionArgsType) => wrapMutation(args1, (args?: MutateFunctionArgsType) =>
      apiEndpoint.detailAsync(
        ...preprocessArgs(args),
        addMetaQuery(args?.query || {}),
      )),
  });
  const fnList = useMutation({
    ...augmentHandlers(OperationTypeEnum.LIST, resourceHandlers?.list || {}),
    mutationFn: (args1?: MutateFunctionArgsType) => wrapMutation(args1, (args?: MutateFunctionArgsType) =>
      apiEndpoint.listAsync(
        ...[
          ...(isChildResource ? (Array.isArray(args?.id) ? args?.id : [args?.id]) : []),
          addMetaQuery(args?.query || {}),
        ],
      )),
  });
  const fnUpdate = useMutation({
    ...augmentHandlers(OperationTypeEnum.UPDATE, resourceHandlers?.update || {}),
    mutationFn: (args1?: MutateFunctionArgsType) => wrapMutation(args1, (args?: MutateFunctionArgsType) =>
      apiEndpoint.useUpdate(
        ...preprocessArgs(args),
        addMetaQuery(args?.query || {}),
      )(preprocessPayload(args?.payload || {}))),
  });

  function handleStatusUpdate(context: any) {
    Object.entries({
      [OperationTypeEnum.CREATE]: fnCreate,
      [OperationTypeEnum.DELETE]: fnDelete,
      [OperationTypeEnum.DETAIL]: fnDetail,
      [OperationTypeEnum.LIST]: fnList,
      [OperationTypeEnum.UPDATE]: fnUpdate,
    })?.forEach(([operation, fn]) => {
      const changed = statusRef?.current?.[operation] !== fn.status;
      statusRef.current[operation] = fn.status;
      if (subscribeToStatusUpdates && changed) {
        setStatus(statusRef.current);
      }
    });
  }

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
    modelsRef,
    status,
    update: mutationUpdate,
  } as MutateType;
}
