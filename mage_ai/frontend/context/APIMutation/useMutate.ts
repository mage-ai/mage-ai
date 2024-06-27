// https://tanstack.com/query/v4/docs/framework/react/reference/useMutation
import axios from 'axios';
import { FetcherOptionsType, preprocess } from '@api/utils/fetcher';
import { buildUrl } from '@api/utils/url';
import { OperationTypeEnum, ResponseTypeEnum } from '@api/constants';
import { hyphensToSnake } from '@utils/url';
import { isEqual } from '@utils/hash';
import { useContext, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { APIErrorType, APIMutationContext } from './Context';
import {
  HandlersType,
  ModelsType,
  MutateFunctionArgsType,
  ResourceType,
  MutateFunctionType,
  MutateType,
  MutationStatusMappingType,
  ResourceHandlersType,
  ResponseType,
  URLOptionsType,
} from '@api/interfaces';

import { MutationStatusEnum as MutationStatusEnumBase } from '@api/enums';
import { singularize } from '@utils/string';

export const MutationStatusEnum = MutationStatusEnumBase;

export function useMutate(
  endpoint: string | string[],
  opts?: {
    callbackOnEveryRequest?: boolean;
    throttle?: Record<OperationTypeEnum, number>;
    handlers?: ResourceHandlersType;
    parse?: string | ((...args: any[]) => any);
    urlParser?: URLOptionsType;
    subscribeToStatusUpdates?: boolean;
  },
): MutateType {
  const context = useContext(APIMutationContext);

  const {
    callbackOnEveryRequest,
    subscribeToStatusUpdates,
    throttle: throttleProp,
  } = opts || {};
  const {
    disableEncodeURIComponent,
    disableHyphenCase,
  } = opts?.urlParser ?? {};

  const { handlers: resourceHandlers, parse } = opts || {};

  const resourceNames = typeof endpoint === 'string' ? endpoint.split('.') : endpoint;
  const [resourceParent, resource] = resourceNames?.length >= 2 ? resourceNames : [null, ...resourceNames];
  const resourceName = singularize(resource);

  const abortControllerRef = useRef<Record<OperationTypeEnum, AbortController>>({
    [OperationTypeEnum.CREATE]: null,
    [OperationTypeEnum.DELETE]: null,
    [OperationTypeEnum.DETAIL]: null,
    [OperationTypeEnum.LIST]: null,
    [OperationTypeEnum.UPDATE]: null,
  });

  const throttleRef = useRef<Record<OperationTypeEnum, number>>({
    [OperationTypeEnum.CREATE]: 1000,
    [OperationTypeEnum.DELETE]: 1000,
    [OperationTypeEnum.DETAIL]: 1000,
    [OperationTypeEnum.LIST]: 1000,
    [OperationTypeEnum.UPDATE]: 1000,
    ...throttleProp,
  });
  const checkpointRef = useRef<{
    [OperationTypeEnum.CREATE]: number;
    [OperationTypeEnum.DELETE]: number;
    [OperationTypeEnum.DETAIL]: number;
    [OperationTypeEnum.LIST]: number;
    [OperationTypeEnum.UPDATE]: number;
  }>(null);
  const modelsRef = useRef<ModelsType>({});

  const statusRef = useRef<MutationStatusMappingType>({
    [OperationTypeEnum.CREATE]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.DELETE]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.DETAIL]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.LIST]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.UPDATE]: MutationStatusEnumBase.IDLE,
  });
  const [status, setStatus] = useState<MutationStatusMappingType>();

  function preprocessPayload({ payload }: { payload?: any } = {}): {
    [key: string]: any;
  } {
    return {
      [resourceName]: payload,
    };
  }

  function handleResponse(response: ResponseType, variables?: any, ctx?: any) {
    if (!callbackOnEveryRequest && response && isEqual(response, modelsRef.current)) {
      return;
    }

    const { data } = response || {};
    modelsRef.current = {
      ...modelsRef.current,
      ...data,
    };

    const result = typeof parse === 'function'
      ? parse(data)
      : resourceName in data ? data?.[resourceName] : data?.[resource];

    handleStatusUpdate();

    return result;
  }

  function handleError(error: APIErrorType, variables?: any, ctx?: any) {
    console.error(error);
    context && context?.renderError(error);
    handleStatusUpdate();
    return error;
  }

  async function fetch(operation: OperationTypeEnum, args?: any, opts: FetcherOptionsType = {}): Promise<any> {
    const argsArr = preprocessArgs(args) ?? {};
    const [id1, id2] = [...argsArr, null];

    const urlArg: string = buildUrl(...[resourceParent ?? resource, id1, resourceParent ? resource : null, id2]);

    const {
      responseType = ResponseTypeEnum.JSON,
      signal = null,
    } = opts || {} as FetcherOptionsType;

    const { data, headers, method, queryString, url } = preprocess(urlArg, {
      ...opts,
      body: preprocessPayload(args),
      method: OperationTypeEnum.CREATE === operation
        ? 'POST'
        : OperationTypeEnum.DELETE === operation
          ? 'DELETE'
          : OperationTypeEnum.UPDATE === operation
            ? 'PUT'
            : 'GET',
      query: addMetaQuery(args),
    });

    return axios.request({
      data: data.body,
      headers,
      method,
      onDownloadProgress: opts?.onDownloadProgress
        ? e =>
            opts.onDownloadProgress(e, {
              body: opts?.body,
              query: opts?.query,
            })
        : null,
      onUploadProgress: opts?.onUploadProgress
        ? e =>
            opts.onUploadProgress(e, {
              body: opts?.body,
              query: opts?.query,
            })
        : null,
      responseType,
      signal,
      url: queryString ? `${url}?${queryString}` : url,
    });
  }

  function augmentHandlers(operation: OperationTypeEnum) {
    const handlers = resourceHandlers?.[operation] ?? {};
    const { onError, onSuccess } = handlers || ({} as HandlersType);

    return {
      ...(handlers || {}),
      mutationFn: (args?: MutateFunctionArgsType) => wrapMutation(operation, args),
      onError: (error: any, variables: any, context?: any) => {
        handleError(error, variables, context)
        onError && onError(error, variables, context);
      },
      onSettled: () => handleStatusUpdate(),
      onSuccess: (response: ResponseType, variables: any, context?: any) => {
        onSuccess && onSuccess(handleResponse(response, variables, context));
      }
    };
  }

  function addMetaQuery({ query }: { query?: any } = {}): any {
    return {
      ...query,
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

  async function wrapMutation(operation: OperationTypeEnum, args?: MutateFunctionArgsType) {
    const now = Number(new Date());

    if (checkpointRef?.current?.[operation] === null) {
      checkpointRef.current[operation] = now;
    }

    if (operation in (throttleRef?.current ?? {}) && now - (checkpointRef?.current?.[operation] ?? 0) < throttleRef?.current?.[operation]) {
      console.log('SKIPPING', checkpointRef)
      return Promise.resolve(null);
    }

    if (abortControllerRef?.current?.[operation]) {
      abortControllerRef?.current?.[operation].abort();
    }
    abortControllerRef.current[operation] = new AbortController();
    const signal = abortControllerRef.current[operation].signal;

    return fetch(operation, args, { signal });
  }

  const fnCreate = useMutation(augmentHandlers(OperationTypeEnum.CREATE));
  const fnDelete = useMutation(augmentHandlers(OperationTypeEnum.DELETE));
  const fnDetail = useMutation(augmentHandlers(OperationTypeEnum.DETAIL));
  const fnList = useMutation(augmentHandlers(OperationTypeEnum.LIST));
  const fnUpdate = useMutation(augmentHandlers(OperationTypeEnum.UPDATE));

  function handleStatusUpdate() {
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
