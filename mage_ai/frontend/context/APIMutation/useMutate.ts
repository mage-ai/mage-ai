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
  IDArgsType,
  ArgsValueOrFunctionType,
} from '@api/interfaces';

import { MutationStatusEnum as MutationStatusEnumBase } from '@api/enums';
import { singularize } from '@utils/string';

export const MutationStatusEnum = MutationStatusEnumBase;

export function useMutate(
  args: IDArgsType,
  opts?: {
    callbackOnEveryRequest?: boolean;
    handlers?: ResourceHandlersType;
    parse?: string | ((...args: any[]) => any);
    subscribeToStatusUpdates?: boolean;
    throttle?: Record<OperationTypeEnum, number>;
    urlParser?: URLOptionsType;
  },
): MutateType {
  const {
    id,
    idParent,
    resource,
    resourceParent,
  } = args;
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
  const resourceName = singularize(resource);

  const abortControllerRef = useRef<Record<OperationTypeEnum, AbortController>>({
    [OperationTypeEnum.CREATE]: null,
    [OperationTypeEnum.DELETE]: null,
    [OperationTypeEnum.DETAIL]: null,
    [OperationTypeEnum.LIST]: null,
    [OperationTypeEnum.UPDATE]: null,
  });

  const throttleRef = useRef<Record<OperationTypeEnum, number>>({
    [OperationTypeEnum.CREATE]: 300,
    [OperationTypeEnum.DELETE]: 300,
    [OperationTypeEnum.DETAIL]: 300,
    [OperationTypeEnum.LIST]: 300,
    [OperationTypeEnum.UPDATE]: 300,
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

  const requests = useRef<Record<OperationTypeEnum, any[]>>({
    [OperationTypeEnum.CREATE]: [],
    [OperationTypeEnum.DELETE]: [],
    [OperationTypeEnum.DETAIL]: [],
    [OperationTypeEnum.LIST]: [],
    [OperationTypeEnum.UPDATE]: [],
  });

  const statusRef = useRef<MutationStatusMappingType>({
    [OperationTypeEnum.CREATE]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.DELETE]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.DETAIL]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.LIST]: MutationStatusEnumBase.IDLE,
    [OperationTypeEnum.UPDATE]: MutationStatusEnumBase.IDLE,
  });
  const [status, setStatus] = useState<MutationStatusMappingType>();

  function preprocessPayload({ payload }: { payload?: ArgsValueOrFunctionType } = {}): {
    [key: string]: any;
  } {
    return {
      [resourceName]: typeof payload === 'function' ? payload(modelsRef?.current?.[resourceName]) : payload,
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
      : resourceName in (data ?? {}) ? data?.[resourceName] : data?.[resource];

    handleStatusUpdate();

    return result;
  }

  function handleError(error: APIErrorType, operation: OperationTypeEnum) {
    console.error(error);
    context && context?.renderError(error, (event) => {
      const reqs = requests.current[operation] ?? [];
      const args = reqs.pop();
      console.log(args)
      if (args) {
        wrapMutation(...(args ?? []) as [any, any]).then(handleArgs).catch(handleError);
      }
    });
    handleStatusUpdate();
    return error;
  }

  async function fetch(operation: OperationTypeEnum, args?: any, opts: FetcherOptionsType = {}): Promise<any> {
    const urlArg: string = buildUrl(...[
      resourceParent ?? resource,
      handleArgs(idParent ?? id),
      resourceParent ? resource : null,
      handleArgs(idParent ? id : null),
    ]);

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
        handleError(error, operation)
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

  function handleArgs(id?: string): string {
    if (!id) return id;

    const handlers = [
      (url: string) => disableHyphenCase ? url : hyphensToSnake(url),
      (url: string) => disableEncodeURIComponent ? url : encodeURIComponent(url),
    ];
    return handlers.reduce((acc, handler) => handler(acc), id as string);
  }

  async function wrapMutation(operation: OperationTypeEnum, args?: MutateFunctionArgsType) {
    const now = Number(new Date());

    context?.dismissError();
    context?.dismissTarget();

    if (checkpointRef?.current?.[operation] === null) {
      checkpointRef.current[operation] = now;
    }

    if (operation in (throttleRef?.current ?? {})
      && now - (checkpointRef?.current?.[operation] ?? 0) < throttleRef?.current?.[operation]) {
      return Promise.resolve(null);
    }

    if (abortControllerRef?.current?.[operation]) {
      abortControllerRef?.current?.[operation].abort();
    }
    abortControllerRef.current[operation] = new AbortController();
    const signal = abortControllerRef.current[operation].signal;

    const request = [operation, args]
    requests.current[operation].push(request);

    if (args?.event) {
      const target = (args?.event?.target as HTMLElement).closest('[role="button"]') as HTMLElement;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      context.renderTarget({
        rect,
      });
    }

    return fetch(...request as [any, any], { signal });
  }

  const fnCreate = useMutation(augmentHandlers(OperationTypeEnum.CREATE));
  const fnDelete = useMutation(augmentHandlers(OperationTypeEnum.DELETE));
  const fnDetail = useMutation(augmentHandlers(OperationTypeEnum.DETAIL));
  const fnList = useMutation(augmentHandlers(OperationTypeEnum.LIST));
  const fnUpdate = useMutation(augmentHandlers(OperationTypeEnum.UPDATE));

  function handleStatusUpdate() {
    context.dismissTarget();

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
