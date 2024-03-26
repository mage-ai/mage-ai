import useSWR from 'swr';
import { ResponseType } from 'axios';

import {
  buildFetch,
  buildFetchV2,
  DELETE,
  fetcher,
  FetcherOptionsType,
  GET,
  POST,
  PUT,
} from './fetcher';
import { buildUrl } from './url';

function validateID(value: number | string | boolean): number | string | boolean {
  if (typeof value !== 'undefined' && value !== null && value !== false) {
    return value;
  }

  return null;
}

export function fetchCreate(resource: string, body: object, opts: any = {}) {
  return buildFetchV2(buildUrl(resource), { ...opts, body, method: POST });
}

export function fetchCreateWithParent(
  resource: string,
  parentResource: string,
  parentId: string,
  body: object,
  opts: any = {},
) {
  const url: string = buildUrl(parentResource, parentId, resource);

  return buildFetchV2(url, { ...opts, body, method: POST });
}

export function fetchCreateWithParentAndChild(
  resource: string,
  parentResource: string,
  parentId: string,
  id: string,
  body: object,
  opts: any = {},
) {
  const url: string = buildUrl(parentResource, parentId, resource, id);

  return buildFetchV2(url, { ...opts, body, method: POST });
}

export function fetchUpdateWithParent(
  resource: string,
  parentResource: string,
  parentId: string,
  id: string,
  body: object,
  opts: any = {},
) {
  const url: string = buildUrl(parentResource, parentId, resource, id);

  return buildFetchV2(url, { ...opts, body, method: PUT });
}

export function fetchDetailAsync(ctx: any, resource: string, id: string, query: object = {}) {
  return buildFetch(buildUrl(resource, id), { ctx, query, method: GET });
}

export function fetchListAsync(ctx: any, resource: string, query: object = {}) {
  return buildFetch(buildUrl(resource), { ctx, query, method: GET });
}

export function fetchListWithParentAsync(
  ctx: any,
  resource: string,
  parentResource: string,
  parentId: string,
  query: object = {},
) {
  return buildFetch(buildUrl(parentResource, parentId, resource), { ctx, query, method: GET });
}

export function fetchUpdate(resource: string, id: string, body: any, query: any = {}) {
  const url: string = buildUrl(resource, id, null, null, query);

  return buildFetchV2(url, { body, method: PUT });
}

export function useDetail(
  resource: string,
  id: string,
  query: any = {},
  swrOptions: any = {},
  customOptions?: {
    key?: string;
    pauseFetch?: boolean;
  },
) {
  const {
    key: keyInit,
    pauseFetch,
  } = customOptions || {};

  const url = validateID(id) ? buildUrl(resource, id) : null;
  const key = url && keyInit ? keyInit : url;

  const {
    data,
    isValidating,
    error,
    mutate,
  } = useSWR(
    pauseFetch ? null : key,
    () => fetcher(url, {
      method: GET,
      query,
    }),
    swrOptions,
  );

  return {
    data,
    error,
    isValidating,
    mutate,
  };
}

export function useDetailWithParent(
  resource: string,
  id: string,
  parentResource: string,
  parentId: string,
  query: any = {},
  swrOptions: any = {},
  grandchildResource?: string,
  customOptions?: {
    key?: string;
  },
) {
  const {
    key: keyInit,
  } = customOptions || {};

  const url = validateID(id) && (validateID(parentId) ? buildUrl(
    parentResource,
    parentId,
    resource,
    id,
    query,
    grandchildResource,
  ) : null);
  const key = url && keyInit ? keyInit : url;

  const {
    data,
    error,
    mutate,
  } = useSWR(
    key,
    () => fetcher(url, { method: GET, query }),
    swrOptions,
  );

  return {
    data,
    error,
    mutate,
  };
}

export function useListAsync(
  resource: string,
  query: any = {},
  options: FetcherOptionsType = {},
) {
  return buildFetchV2(
    buildUrl(
      resource,
      null,
      null,
      null,
      query,
      null,
    ),
    {
      ...options,
      method: GET,
      query,
    },
  );
}

export function useListWithParentAsync(
  resource: string,
  parentResource: string,
  parentId: string,
  query: any = {},
  options: FetcherOptionsType = {},
) {
  return buildFetchV2(
    buildUrl(
      parentResource,
      parentId,
      resource,
      null,
      query,
      null,
    ),
    {
      ...options,
      method: GET,
      query,
    },
  );
}

export function useDetailAsync(
  resource: string,
  id: string,
  query: any = {},
  options: FetcherOptionsType = {},
) {
  return buildFetchV2(
    buildUrl(
      resource,
      id,
      null,
      null,
      query,
      null,
    ),
    {
      ...options,
      method: GET,
      query,
    },
  );
}

export function useDetailWithParentAsync(
  resource: string,
  id: string,
  parentResource: string,
  parentId: string,
  query: any = {},
  options: FetcherOptionsType = {},
  grandchildResource?: string,
) {
  return buildFetchV2(buildUrl(
      parentResource,
      parentId,
      resource,
      id,
      query,
      grandchildResource,
    ),
    { ...options, method: GET, query },
  );
}

export function useDelete(resource: string, id: string, query: object = {}) {
  return buildFetch(buildUrl(resource, id), { query, method: DELETE });
}

export function useDeleteWithParent(resource: string,
  parentResource: string,
  parentId: string,
  id: string,
  query: object = {},
) {
  return buildFetch(buildUrl(parentResource, parentId, resource, id), { query, method: DELETE });
}

export function useList(
  resource: string,
  query: object = {},
  swrOptions: any = {},
  opts: any = {},
) {
  const { pauseFetch = false } = opts;
  const {
    data,
    error,
    isValidating,
    mutate,
  } = useSWR(
    pauseFetch ? null : buildUrl(resource, null, null, null, query),
    url => fetcher(url),
    swrOptions,
  );

  return {
    data,
    error,
    loading: !data && !error,
    isValidating,
    mutate,
  };
}

export function useListWithParent(
  resource: string,
  parentResource: string,
  parentId: string,
  query: object = {},
  // https://swr.vercel.app/docs/options#options
  swrOptions: any = {},
) {
  const {
    data,
    error,
    mutate,
  } = useSWR(
    parentId ? buildUrl(parentResource, parentId, resource, null, query) : null,
    url => fetcher(url),
    swrOptions,
  );

  return {
    data,
    error,
    loading: !data && !error,
    mutate,
  };
}

export function useUpdate(
  ctx: any,
  resource: string,
  id: string,
  body: object,
  query: object = {},
) {
  return buildFetch(buildUrl(resource, id, null, null, query), { body, ctx, method: PUT });
}
