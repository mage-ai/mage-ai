import { useMutation } from 'react-query';

import api from '@api';import { InvokeRequestOptionsType } from './ItemApplication/constants';
import {
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
  ValidationTypeEnum,
} from '@interfaces/CommandCenterType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { onSuccess } from '@api/utils/response';
import { updateActionFromUpstreamResults } from './utils';
import { isEmptyObject, selectEntriesWithValues } from '@utils/hash';

export default function useInvokeRequest({
  onSuccessCallback,
  showError,
}: {
  onSuccessCallback?: (
    value: any | any[],
    variables: {
      action: CommandCenterActionType;
      focusedItemIndex: number;
      index: number;
      item: CommandCenterItemType;
    },
  ) => void;
  showError?: (opts: {
    errors: any;
    response: any;
  }) => void;
}): {
  invokeRequest: (opts: {
    action: CommandCenterActionType;
    results: KeyValueType;
  }) => Promise<any>;
  isLoading: boolean;
} {
  const [
    invokeRequest,
    {
      isLoading: isLoadingRequest,
    },
  ] = useMutation(
    ({
      action,
      results,
    }: InvokeRequestOptionsType) => {
      const actionCopy = updateActionFromUpstreamResults(action, results);

      const {
        request: {
          operation,
          payload,
          query: queryInit,
          resource,
          resource_id: resourceID,
          resource_parent: resourceParent,
          resource_parent_id: resourceParentID,
        },
      } = actionCopy;

      let endpoint = api?.[resource];
      if (resourceParent) {
        endpoint = endpoint?.[resourceParent];
      }

      const ids = [];

      if (resourceParentID) {
        ids.push(resourceParentID);
      }

      if (resourceID) {
        ids.push(resourceID);
      }

      let submitRequest = null;
      const args = [...ids];
      const opts: {
        query?: KeyValueType;
      } = {};
      const query = selectEntriesWithValues(queryInit);
      if (!isEmptyObject(query)) {
        opts.query = query;
      }

      if (OperationTypeEnum.CREATE === operation) {
        submitRequest = () => endpoint?.useCreate(...ids, opts)(payload);
      } else if (OperationTypeEnum.UPDATE === operation) {
        submitRequest = () => endpoint?.useUpdate(...ids, opts)(payload);
      } else if (OperationTypeEnum.DELETE === operation) {
        submitRequest = () => endpoint?.useDelete(...ids, opts?.query)();
      } else if (OperationTypeEnum.DETAIL === operation) {
        submitRequest = () => endpoint?.detailAsync(...ids, opts?.query);
      } else if (OperationTypeEnum.LIST === operation) {
        submitRequest = () => endpoint?.listAsync(...ids, opts?.query);
      }

      if (submitRequest) {
        return submitRequest();
      }
    },
    {
      onSuccess: (
        response: any,
        variables: {
          action: CommandCenterActionType;
          focusedItemIndex: number;
          index: number;
          item: CommandCenterItemType;
          results: KeyValueType;
        },
      ) => {
        return onSuccess(
          response,
          {
            callback: (
              resp: {
                [key: string]: KeyValueType;
              },
            ) => {
              const {
                action,
                focusedItemIndex,
                index = 0,
                item,
              } = variables;
              const {
                request: {
                  response_resource_key: responseResourceKey,
                },
              } = action;

              const value = resp?.[responseResourceKey];

              if (onSuccessCallback) {
                onSuccessCallback?.(
                  value,
                  {
                    action,
                    focusedItemIndex,
                    index,
                    item,
                  },
                );
              }
            },
            onErrorCallback: (response, errors) => showError?.({
              errors,
              response,
            }),
          },
        );
      },
    },
  );

  return {
    invokeRequest,
    isLoading: isLoadingRequest,
  };
}
