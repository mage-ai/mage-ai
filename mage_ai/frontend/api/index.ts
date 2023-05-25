import { useMutation } from 'react-query';

import {
  fetchCreate,
  fetchCreateWithParent,
  fetchCreateWithParentAndChild,
  fetchUpdateWithParent,
  fetchDetailAsync,
  fetchListAsync,
  fetchListWithParentAsync,
  fetchUpdate,
  useDelete,
  useDeleteWithParent,
  useDetail,
  useDetailWithParent,
  useList,
  useListWithParent,
  useUpdate,
} from './utils/use';
import { handle } from '@api/utils/response';
import { onError, onSuccess } from '@api/utils/response';

export const ACTION_EXECUTE = 'execute';
export const ANALYSES = 'analyses';
export const AUTOCOMPLETE_ITEMS = 'autocomplete_items';
export const BACKFILLS: 'backfills' = 'backfills';
export const BLOCKS: 'blocks' = 'blocks';
export const BLOCK_RUNS: 'block_runs' = 'block_runs';
export const BLOCK_TEMPLATES = 'block_templates';
export const BLOCK_OUTPUTS = 'block_outputs';
export const CLUSTERS: 'clusters' = 'clusters';
export const COLUMNS: 'columns' = 'columns';
export const DATA_PROVIDERS: 'data_providers' = 'data_providers';
export const DOWNLOADS: 'downloads' = 'downloads';
export const EVENT_MATCHERS = 'event_matchers';
export const EVENT_RULES = 'event_rules';
export const EXTENSION_OPTIONS = 'extension_options';
export const FEATURES: 'features' = 'features';
export const FEATURE_SETS: 'feature_sets' = 'feature_sets';
export const FEATURE_SET_VERSIONS: 'feature_set_versions' = 'feature_set_versions';
export const FILES: 'files' = 'files';
export const FILE_CONTENTS: 'file_contents' = 'file_contents';
export const FILE_VERSIONS: 'file_versions' = 'file_versions';
export const FOLDERS: 'folders' = 'folders';
export const GIT_BRANCHES: 'git_branches' = 'git_branches';
export const INSTANCES: 'instances' = 'instances';
export const INTEGRATION_DESTINATIONS: 'integration_destinations' = 'integration_destinations';
export const INTEGRATION_SAMPLES = 'integration_samples';
export const INTEGRATION_SOURCES = 'integration_sources';
export const INTEGRATION_SOURCE_STREAMS = 'integration_source_streams';
export const KERNELS: 'kernels' = 'kernels';
export const LOGS = 'logs';
export const MONITOR_STATS = 'monitor_stats';
export const OUTPUTS = 'outputs';
export const PIPELINES: 'pipelines' = 'pipelines';
export const PIPELINE_RUNS: 'pipeline_runs' = 'pipeline_runs';
export const PIPELINE_SCHEDULES: 'pipeline_schedules' = 'pipeline_schedules';
export const PROJECTS: 'projects' = 'projects';
export const ROLES: 'roles' = 'roles';
export const SECRETS: 'secrets' = 'secrets';
export const SESSIONS: 'sessions' = 'sessions';
export const STATUSES: 'statuses' = 'statuses';
export const SYNCS: 'syncs' = 'syncs';
export const TRANSFORMER_ACTIONS: 'transformer_actions' = 'transformer_actions';
export const USERS: 'users' = 'users';
export const VARIABLES: 'variables' = 'variables';
export const VERSIONS: 'versions' = 'versions';
export const WIDGETS: 'widgets' = 'widgets';
export const WORKSPACES: 'workspaces' = 'workspaces';

// Update this as routes get added
const RESOURCES: any[][] = [
  [ACTION_EXECUTE, PIPELINES],
  [AUTOCOMPLETE_ITEMS],
  [BACKFILLS],
  [BACKFILLS, PIPELINES],
  [BLOCK_RUNS],
  [BLOCK_TEMPLATES],
  [BLOCKS],
  [BLOCKS, PIPELINES],
  [BLOCKS, PIPELINES, ANALYSES],
  [BLOCK_OUTPUTS],
  [CLUSTERS],
  [COLUMNS, FEATURE_SETS],
  [DATA_PROVIDERS],
  [DOWNLOADS, FEATURE_SETS],
  [EVENT_MATCHERS],
  [EVENT_RULES],
  [EXTENSION_OPTIONS],
  [FEATURE_SETS],
  [FILES],
  [FILE_CONTENTS],
  [FILE_VERSIONS, BLOCKS],
  [FILE_VERSIONS, FILES],
  [FOLDERS],
  [GIT_BRANCHES],
  [INSTANCES, CLUSTERS],
  [INTEGRATION_DESTINATIONS],
  [INTEGRATION_SAMPLES, INTEGRATION_SOURCES],
  [INTEGRATION_SOURCES],
  [INTEGRATION_SOURCE_STREAMS],
  [KERNELS],
  [LOGS, PIPELINES],
  [MONITOR_STATS],
  [OUTPUTS, BLOCK_RUNS],
  [PIPELINES],
  [PIPELINE_RUNS],
  [PIPELINE_RUNS, PIPELINE_SCHEDULES],
  [PIPELINE_SCHEDULES],
  [PIPELINE_SCHEDULES, PIPELINES],
  [PROJECTS],
  [ROLES],
  [SECRETS],
  [SESSIONS],
  [STATUSES],
  [SYNCS],
  [USERS],
  [VARIABLES, PIPELINES],
  [VERSIONS, FEATURE_SETS],
  [WIDGETS, PIPELINES],
  [WORKSPACES],
];

const apis: any = {};

RESOURCES.forEach(([resource, parentResource, grandchildResource, swrOptions]) => {
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
      useUpdate: (id, query: any = {}) => async (body: any) => fetchUpdate(resource, id, body, query),
    };
  }

  if (grandchildResource) {
    apis[resource][parentResource][grandchildResource] = {};
    apis[resource][parentResource][grandchildResource].detail = (
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
      grandchildResource,
    );
  } else if (parentResource) {
    apis[resource][parentResource] = {};

    apis[resource][parentResource].useCreate = (parentId, opts?: any) => async (body: any) =>
      fetchCreateWithParent(resource, parentResource, parentId, body, opts);

    apis[resource][parentResource].useCreateWithParent = (parentId: string, id: string, opts?: any) => async (body: any) =>
      fetchCreateWithParentAndChild(resource, parentResource, parentId, id, body, opts);

    apis[resource][parentResource].useCreateWithParentIdLater = (opts?: any) => async (opts2: any) =>
      fetchCreateWithParent(resource, parentResource, opts2.parentId, opts2.body, opts);

    apis[resource][parentResource].useUpdate = (parentId: string, id: string, opts?: any) => async (body: any) =>
      fetchUpdateWithParent(resource, parentResource, parentId, id, body, opts);

    apis[resource][parentResource].useDelete = (parentId: string, id: string, query?: object) => async () => {
      const response = await useDeleteWithParent(resource, parentResource, parentId, id, query);

      return await handle(response);
    },

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

    apis[resource].useDelete = (id: string, query?: object) => async () => {
      const response = await useDelete(resource, id, query);

      return await handle(response);
    },

    apis[resource].listAsync = async (ctx: any, query: any = {}) => {
      const response = await fetchListAsync(ctx, resource, query);

      return await handle(response);
    };

    apis[resource].list = (
      query: any = {},
      swrOptionsRuntime?: any,
      opts?: any,
    ) => useList(resource, query, {
      ...swrOptions,
      ...swrOptionsRuntime,
    }, opts);
  }
});

export function useCustomFetchRequest({
  endpoint,
  method,
  onSuccessCallback,
}: {
  endpoint: string,
  method: string,
  onSuccessCallback?: (any) => void,
}): [(payload?: any) => void, boolean] {
  const errorMessage = 'Request failed.';
  const successMessage = 'Request successful.';

  const [fetchData, { isLoading }] = useMutation(
    async (payload: any) => fetch(
      `${endpoint}`,
      {
        body: (method === 'GET' || method === 'DELETE')
          ? null
          : JSON.stringify({
            ...payload,
          }),
        method,
      },
    ),
    {
      // @ts-ignore
      onError: (error) => onError(
        error, {
          errorMessage,
        },
      ),
      onSuccess: (response: any) => onSuccess(
        response,
        {
          callback: (res) => {
            onSuccessCallback(res);
            if (!Array.isArray(res) && typeof res === 'object' && res.code && res.code >= 400) {
              console.error(errorMessage);
            } else {
              // console.log(successMessage);
            }
          },
        },
      ),
    },
  );

  return [fetchData, isLoading];
}

export default apis;
