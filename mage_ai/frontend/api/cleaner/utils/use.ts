import useSWR from 'swr';

import { DELETE, GET, POST, PUT, buildFetch, buildFetchV2, fetcher } from './fetcher';
import { buildUrl } from './url';

export function fetchCreate(resource: string, body: object, opts: any = {},) {
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

export function fetchUpdate(resource: string, id: string, body: any) {
  const url: string = buildUrl(resource, id);

  return buildFetch(url, { body, method: PUT });
}

export function useDetail(
  resource: string,
  id: string,
  query: any = {},
  swrOptions: any = {},
) {
  const {
    data,
    error,
    mutate,
  } = useSWR(
    id ? buildUrl(resource, id) : null,
    url => fetcher(url, {
      method: GET,
      query,
    }),
    swrOptions,
  );

  return {
    data,
    error,
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
) {
  const {
    data,
    error,
    mutate,
  } = useSWR(
    id && parentId ? buildUrl(
      parentResource,
      parentId,
      resource,
      id,
      query,
    ) : null,
    url => fetcher(url, { method: GET, query }),
    swrOptions,
  );

  return {
    data,
    error,
    mutate,
  };
}

export function useDelete(resource: string, id: string) {
  return buildFetch(buildUrl(resource, id), { method: DELETE });
}

export function useList(
  resource: string,
  query: object = {},
  swrOptions: any = {},
) {
  const {
    data,
    error,
    mutate,
  } = useSWR(
    buildUrl(resource, null, null, null, query),
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

export function useUpdate(ctx: any, resource: string, id: string, body: object) {
  return buildFetch(buildUrl(resource, id), { ctx, body, method: PUT });
}
