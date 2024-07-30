import axios from 'axios';
import { FetcherOptionsType, preprocess } from '@api/utils/fetcher';
import { buildUrl } from '@api/utils/url';
import { OperationTypeEnum, ResponseTypeEnum } from '@api/constants';
import { hyphensToSnake } from '@utils/url';
import { getClosestRole, getClosestChildRole } from '@utils/elements';
import { useContext, useMemo, useRef, useState } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';
import { useMutation } from '@tanstack/react-query';
import { APIErrorType, APIMutationContext } from './Context';
import {
  HandlersType,
  ModelsType,
  MutateFunctionArgsType,
  ResourceType,
  MutateType,
  MutationStatusMappingType,
  ResourceHandlersType,
  ResponseType,
  MutationFetchArgumentsType,
  URLOptionsType,
  IDArgsType,
  ArgsValueOrFunctionType,
} from '@api/interfaces';

import { MutationStatusEnum as MutationStatusEnumBase } from '@api/enums';
import { singularize } from '@utils/string';

export const MutationStatusEnum = MutationStatusEnumBase;

export function useMutate(
  argsInit: IDArgsType,
  opts?: {
    automaticAbort?: boolean;
    callbackOnEveryRequest?: boolean;
    handlers?: ResourceHandlersType;
    parse?: string | ((...args: any[]) => any);
    subscribeToStatusUpdates?: boolean;
    throttle?: Record<OperationTypeEnum, number>;
    urlParser?: URLOptionsType;
  },
): MutateType {
  const { id, idParent, resource, resourceParent } = argsInit;
  const context = useContext(APIMutationContext);

  const {
    automaticAbort,
    callbackOnEveryRequest,
    subscribeToStatusUpdates,
    throttle: throttleProp,
  } = opts || {};
  const { disableEncodeURIComponent, disableHyphenCase } = opts?.urlParser ?? {};

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

  function getModel(uuid?: string): ResourceType {
    return modelsRef?.current?.[resourceName]?.[uuid ?? id];
  }

  function getModels(): ResourceType[] {
    return modelsRef?.current?.[resource];
  }

  function setModel(
    model: ResourceType | ((prev: ResourceType) => ResourceType),
    key?: string,
  ): ResourceType {
    const uuid = key ?? id;
    let modelUpdated = null;
    if (typeof model === 'function') {
      const modelPrev = modelsRef?.current?.[resourceName]?.[uuid];
      modelUpdated = model(modelPrev);
    } else {
      modelUpdated = model;
    }

    modelsRef.current[resourceName] ||= {};
    modelsRef.current[resourceName][uuid] = modelUpdated;

    return modelsRef.current[resourceName];
  }

  function setModels(
    models: ResourceType[] | ((prev: ResourceType[]) => ResourceType[]),
  ): ResourceType[] {
    const model2 = typeof models === 'function' ? models(modelsRef.current[resource]) : models;
    modelsRef.current[resource] = model2;
    return modelsRef.current[resource];
  }

  function preprocessPayload({
    batch,
    id,
    payload,
  }: {
    batch?: ArgsValueOrFunctionType;
    payload?: ArgsValueOrFunctionType;
  } & IDArgsType = {}): {
    [key: string]: any;
  } {
    const modelPrev = getModel(id);

    const payloadData = {
      [resourceName]: typeof payload === 'function' ? payload(modelPrev) : payload,
    };

    if (batch) {
      payloadData[resource] = batch;
    }

    return payloadData;
  }

  function handleResponse(response: ResponseType, variables?: any, ctx?: any) {
    // if (!callbackOnEveryRequest && response && isEqual(response, modelsRef.current)) {
    //   return;
    // }
    //
    const ids = {
      id,
      idParent,
      ...variables,
    };
    const { id: idUse } = ids ?? {};

    const { data } = response || {};

    let result = null;
    let resultPrev = null;

    const key = resourceName in (data ?? {}) ? resourceName : resource;

    if (parse && typeof parse === 'function') {
      result = parse(data);
    } else {
      result = data[key];
    }

    if (idUse) {
      resultPrev = modelsRef?.current?.[key]?.[idUse];
      setModel(result ?? resultPrev, idUse);
    } else {
      resultPrev = modelsRef?.current?.[key];
      setModels(result ?? resultPrev);
    }

    handleStatusUpdate();

    return [result, resultPrev];
  }

  function handleError(error: APIErrorType, operation: OperationTypeEnum) {
    console.error(error);
    const { message, name, stack } = (error ?? {}) as any;

    if (context && context?.renderError) {
      context?.renderError(
        {
          client: {
            error: {
              errors: stack && stack?.split('\n')?.map(String),
              message: message && String(message),
              type: name && String(name),
            },
          },
          message,
          ...error,
        },
        (event: MouseEvent) => {
          const reqs = requests.current[operation] ?? [];
          const args = reqs.pop();

          if (args) {
            wrapMutation(operation, { ...args, event })
              .then(handleResponse)
              .catch(err => handleError(err, operation));
          }
        },
      );
    }

    handleStatusUpdate();
    return error;
  }

  function getIDs(args?: MutationFetchArgumentsType): {
    id?: string;
    idParent?: string;
  } {
    const { id: idUse = undefined, idParent: idParentUse = undefined } = {
      ...args,
      ...argsInit,
    };

    return {
      id: idUse ? handleArgs(idUse) : undefined,
      idParent: idParentUse ? handleArgs(idParentUse) : undefined,
    };
  }

  async function fetch(
    operation: OperationTypeEnum,
    args?: MutationFetchArgumentsType,
    opts: FetcherOptionsType = {},
  ): Promise<any> {
    const idArgs = getIDs(args) ?? {};
    const { id: idUse, idParent: idParentUse } = getIDs(args) ?? {};

    const urlArg: string = buildUrl(
      resourceParent ?? resource,
      idParentUse ?? idUse,
      resourceParent ? resource : null,
      resourceParent ? idUse : null,
    );

    const { responseType = ResponseTypeEnum.JSON, signal = null } =
      opts || ({} as FetcherOptionsType);

    const argsCombined = { ...args, ...idArgs };
    const body = preprocessPayload(argsCombined);
    const query = addMetaQuery(args) ?? {};

    if ('batch' in argsCombined) {
      query._batch = true;
    }

    const { data, headers, method, queryString, url } = preprocess(urlArg, {
      ...opts,
      body,
      method:
        OperationTypeEnum.CREATE === operation
          ? 'POST'
          : OperationTypeEnum.DELETE === operation
            ? 'DELETE'
            : OperationTypeEnum.UPDATE === operation
              ? 'PUT'
              : 'GET',
      query,
    });

    return new Promise((resolve, reject) => {
      if (args?.onStart) {
        args?.onStart();
      }

      return axios
        .request({
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
        })
        .then(data => {
          args?.onSuccess && args?.onSuccess?.(data, args, opts);
          return resolve(data);
        })
        .catch(error => {
          args?.onError && args?.onError?.(error, args, opts);
          return reject(error);
        })
        .finally(() => {
          delete abortControllerRef.current[operation];
        });
    });
  }

  function augmentHandlers(operation: OperationTypeEnum) {
    const handlers = resourceHandlers?.[operation] ?? {};
    const { onError, onSuccess } = handlers || ({} as HandlersType);

    return {
      ...(handlers || {}),
      mutationFn: (args?: MutateFunctionArgsType) => wrapMutation(operation, args),
      onError: (error: any, variables: any, ctx?: any) => {
        handleError(error, operation);

        onError && onError(error, variables, ctx);
      },
      onSettled: () => handleStatusUpdate(),
      onSuccess: (response: ResponseType, variables: any, ctx?: any) => {
        const [model, modelPrev] = handleResponse(response, variables, ctx);

        onSuccess && onSuccess(model, modelPrev);
      },
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
      (url: string) => (disableHyphenCase ? url : hyphensToSnake(url)),
      (url: string) => (disableEncodeURIComponent ? url : encodeURIComponent(url)),
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

    if (
      operation in (throttleRef?.current ?? {}) &&
      now - (checkpointRef?.current?.[operation] ?? 0) < throttleRef?.current?.[operation]
    ) {
      return Promise.resolve(null);
    }
    if (automaticAbort && abortControllerRef?.current?.[operation]) {
      console.log(`[useMutate] Aborting ${operation} for ${resource}`, args);
      abortControllerRef?.current?.[operation].abort();
    }

    abortControllerRef.current[operation] = new AbortController();
    const signal = abortControllerRef.current[operation].signal;

    const request = [operation, args];
    requests.current[operation].push(request);

    if (args?.event) {
      const eventTarget = args?.event?.target as HTMLElement;
      const target = eventTarget
        ? getClosestChildRole(eventTarget, [ElementRoleEnum.BUTTON]) ??
          getClosestRole(eventTarget, [ElementRoleEnum.BUTTON])
        : null;
      if (target) {
        const rect = target.getBoundingClientRect();
        context.renderTarget({
          content: null,
          rect,
          target,
        });
      }
    }

    return fetch(...(request as [any, any]), { signal });
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
    abortController: abortControllerRef.current,
    create: mutationCreate,
    delete: mutationDelete,
    detail: mutationDetail,
    getModel,
    getModels,
    list: mutationList,
    setModel,
    setModels,
    status,
    update: mutationUpdate,
  } as MutateType;
}
