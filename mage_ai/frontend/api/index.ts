import {
  fetchCreate,
  fetchCreateWithParent,
  fetchDetailAsync,
  fetchListAsync,
  fetchListWithParentAsync,
  fetchUpdate,
  useDelete,
  useDetail,
  useDetailWithParent,
  useList,
  useListWithParent,
  useUpdate,
} from './utils/use';
import { handle } from '@api/utils/response';

export const FEATURE_SETS: 'feature_sets' = 'feature_sets';
export const FEATURE_SET_VERSIONS: 'feature_set_versions' = 'feature_set_versions';
export const FEATURES: 'features' = 'features';
export const TRANSFORMER_ACTIONS: 'transformer_actions' = 'transformer_actions';

const REFRESH_INTERVAL_MS: number = 30000;

const RESOURCES: any[][] = [
  [FEATURE_SET_VERSIONS, FEATURE_SETS],
  [FEATURES],
  [TRANSFORMER_ACTIONS, FEATURE_SET_VERSIONS, { refreshInterval: REFRESH_INTERVAL_MS }],
];

const apis: any = {};

RESOURCES.forEach(([resource, parentResource, swrOptions]) => {
  if (!apis[resource]) {
    apis[resource] = {
      deleteAsync: async (id: string) => {
        const response = await useDelete(resource, id);

        return await handle(response);
      },
      detail: (
        id: string,
        query: any = {},
        swrOptionsRuntime?: any,
      ) => useDetail(
        resource,
        id,
        query,
        {
          ...swrOptions,
          ...swrOptionsRuntime,
        },
      ),
      detailAsync: async (ctx: any, id: string, query: any = {}) => {
        const response = await fetchDetailAsync(ctx, resource, id, query);

        return await handle(response);
      },
      updateAsync: async (ctx: any, id: string, body: any) => {
        const response = await useUpdate(ctx, resource, id, body);

        return await handle(response);
      },
      useUpdate: (id) => async (body: any) => fetchUpdate(resource, id, body),
    };
  }

  if (parentResource) {
    apis[resource][parentResource] = {};

    apis[resource][parentResource].useCreate = (parentId, opts?: any) => async (body: any) =>
      fetchCreateWithParent(resource, parentResource, parentId, body, opts);

    apis[resource][parentResource].useCreateWithParentIdLater = (opts?: any) => async (opts2: any) =>
      fetchCreateWithParent(resource, parentResource, opts2.parentId, opts2.body, opts);

    apis[resource][parentResource].listAsync = async (ctx: any, parentId: string, query: any = {}) => {
      const response = await fetchListWithParentAsync(ctx, resource, parentResource, parentId, query);

      return await handle(response);
    };

    apis[resource][parentResource].list = (
      parentId: string,
      query: any = {},
      swrOptionsRuntime?: any,
    ) => useListWithParent(
      resource,
      parentResource,
      parentId,
      query,
      {
        ...swrOptions,
        ...swrOptionsRuntime,
      },
    );

    apis[resource][parentResource].detail = (
      parentId: string,
      id: string,
      query?: any,
      swrOptionsRuntime?: any,
    ) => useDetailWithParent(
      resource,
      id,
      parentResource,
      parentId,
      query,
      {
        ...swrOptions,
        ...swrOptionsRuntime,
      },
    );
  } else {
    apis[resource].create = async (body: any, opts?: any) => {
      const response = await fetchCreate(resource, body, opts);

      return await handle(response);
    };

    apis[resource].useCreate = (opts?: any) =>
      async (body: any) => fetchCreate(resource, body, opts);

    apis[resource].listAsync = async (ctx: any, query: any = {}) => {
      const response = await fetchListAsync(ctx, resource, query);

      return await handle(response);
    };

    apis[resource].list = (
      query: any = {},
      swrOptionsRuntime?: any,
    ) => useList(resource, query, {
      ...swrOptions,
      ...swrOptionsRuntime,
    });
  }
});

export default apis;
