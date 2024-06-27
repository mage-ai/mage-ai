// https://tanstack.com/query/v4/docs/framework/react/reference/useMutation
import axios from 'axios';
import { FetcherOptionsType, preprocess } from '@api/utils/fetcher';
import { buildUrl } from '@api/utils/url';
import { OperationTypeEnum, ResponseTypeEnum } from '@api/constants';
import { hyphensToSnake } from '@utils/url';
import { isEqual } from '@utils/hash';
import { useContext, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@api';
import { APIMutationContext } from './Context';
import {
  HandlersType,
  ModelsType,
  MutateFunctionArgsType,
  MutateFunctionType,
  MutateType,
  MutationStatusMappingType,
  ResourceHandlersType,
  ResponseType,
  URLOptionsType,
} from '@api/interfaces';
import { MutationStatusEnum as MutationStatusEnumBase } from '@api/enums';
import { dig } from '@utils/hash';
import { singularize } from '@utils/string';

export const MutationStatusEnum = MutationStatusEnumBase;

export function useMutate(
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
  const context = useContext(APIMutationContext);
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

  const endpoints = typeof endpoint === 'string' ? endpoint.split('.') : endpoint;
  const [resourceNamePlural, parentResourceName] = endpoints?.length >= 2 ? endpoints : [endpoints[0], null];
  const resourceName: string = singularize(resourceNamePlural) as string;
  const isChildResource: boolean = endpoints?.length >= 2;

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

  function preprocessPayload({ payload }: { payload?: any } = {}): {
    [key: typeof resourceName]: any;
  } {
    return {
      [resourceName]: payload,
    };
  }

  function handleResponse(response) {
    return response?.data;
  }

  function handleError(error) {
    return context.renderError(error);
  }

  async function fetch(operation: OperationTypeEnum, args?: any, opts: FetcherOptionsType = {}): Promise<any> {
    const argsArr = preprocessArgs(args) ?? {};
    const [id1, id2] = [...argsArr, null];
    const [resource1, resource2] = endpoints?.length >= 2 ? endpoints : [endpoints[0], null];

    const urlArg: string = buildUrl(...[resource1, id1, resource2, id2]);

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
            ? 'PATCH'
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

  function augmentHandlers(operation: OperationTypeEnum, handlers?: HandlersType) {
    const { onError, onSuccess } = handlers || ({} as HandlersType);

    return {
      ...(handlers || {}),
      onError: (error: any, variables: any, context?: any) => {
        onError && onError?.(error, variables, context);

        context.showError(error);

        handleStatusUpdate([error, variables, context]);
      },
      onSettled: (...args: any[]) => {
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

    if (!checkpointRef?.current) {
      checkpointRef.current = now;
    } else if (now - checkpointRef.current < throttle) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => fetch(operation, args)
      .then(response => resolve(handleResponse(response)))
      .catch(error => reject(handleError(error))))
  }

  const fnCreate = useMutation({
    ...augmentHandlers(OperationTypeEnum.CREATE, resourceHandlers?.create || {}),
    mutationFn: (args?: MutateFunctionArgsType) => wrapMutation(OperationTypeEnum.CREATE, args),
  });

  const fnDelete = useMutation({
    ...augmentHandlers(OperationTypeEnum.DELETE, resourceHandlers?.delete || {}),
    mutationFn: (args?: MutateFunctionArgsType) => wrapMutation(OperationTypeEnum.DELETE, args),
  });
  const fnDetail = useMutation({
    ...augmentHandlers(OperationTypeEnum.DETAIL, resourceHandlers?.detail || {}),
    mutationFn: (args?: MutateFunctionArgsType) => wrapMutation(OperationTypeEnum.DETAIL, args),
  });
  const fnList = useMutation({
    ...augmentHandlers(OperationTypeEnum.LIST, resourceHandlers?.list || {}),
    mutationFn: (args?: MutateFunctionArgsType) => wrapMutation(OperationTypeEnum.LIST, args),
  });
  const fnUpdate = useMutation({
    ...augmentHandlers(OperationTypeEnum.UPDATE, resourceHandlers?.update || {}),
    mutationFn: (args?: MutateFunctionArgsType) => wrapMutation(OperationTypeEnum.UPDATE, args),
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
