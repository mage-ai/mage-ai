import { useMutation } from 'react-query';

import api from '@api';import { InvokeRequestOptionsType } from './ItemApplication/constants';
import {
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
} from '@interfaces/CommandCenterType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { onSuccess } from '@api/utils/response';
import { updateActionFromUpstreamResults } from './utils';

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
  }) => void;
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
          query,
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
      if (OperationTypeEnum.CREATE === operation) {
        submitRequest = () => endpoint?.useCreate(...ids, query)(payload);
      } else if (OperationTypeEnum.UPDATE === operation) {
        submitRequest = () => endpoint?.useUpdate(...ids, query)(payload);
      } else if (OperationTypeEnum.DELETE === operation) {
        submitRequest = () => endpoint?.useDelete(...ids, query)();
      } else if (OperationTypeEnum.DETAIL === operation) {
        submitRequest = () => endpoint?.detailAsync(...ids, query);
      } else if (OperationTypeEnum.LIST === operation) {
        submitRequest = () => endpoint?.listAsync(...ids, query);
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
                focusedItemIndex,
                index = 0,
                action,
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
