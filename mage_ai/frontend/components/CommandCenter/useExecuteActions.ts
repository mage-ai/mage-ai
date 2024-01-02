import {
  CommandCenterActionInteractionTypeEnum,
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
} from '@interfaces/CommandCenterType';
import { InvokeRequestOptionsType } from './ItemApplication/constants';
import {
  interpolatePagePath,
  updateActionFromUpstreamResults,
} from './utils';
import { setNested } from '@utils/hash';

export default function useExecuteActions({
  applicationState: refApplicationState = null,
  invokeRequest,
  itemsRef: refItems = null,
  router,
}: {
  applicationState?: {
    current: KeyValueType;
  };
  invokeRequest: (opts: InvokeRequestOptionsType) => void;
  itemsRef?: {
    current: CommandCenterItemType[];
  };
  router: any;
}): (
  item: CommandCenterItemType,
  focusedItemIndex: number,
  actions?: CommandCenterActionType[],
) => void {
  function executeAction(
    item: CommandCenterItemType,
    focusedItemIndex: number,
    actions: CommandCenterActionType[] = null,
  ) {
    const actionSettings = [];

    if (refItems) {
      if (!item?.actionResults) {
        if (!refItems?.current?.[focusedItemIndex]) {
          refItems.current[focusedItemIndex] = item;
        }

        if (refItems?.current && refItems?.current?.[focusedItemIndex]) {
          refItems.current[focusedItemIndex].actionResults = {};
        }
      }
    }

    (actions || item?.actions || [])?.forEach((actionInit, index: number) => {
      let action = { ...actionInit };

      const applicationState = (refApplicationState
        ? refApplicationState?.current || {}
        : {}
      )?.[action?.uuid];

      if (applicationState) {
        Object.entries(applicationState || {})?.forEach(([key, value]) => {
          setNested(action, key, value);
        });
      }

      if (refItems) {
        if (!refItems?.current?.[focusedItemIndex]?.actionResults) {
          refItems.current[focusedItemIndex].actionResults = {};

          try {
            refItems.current[focusedItemIndex].actionResults[action?.uuid || index] = {
              action,
            };
          } catch (error) {
            console.error('CommandCenter/index.executeAction: ', error);
          }
        }
      }

      const {
        interaction,
        page,
        request,
        uuid: actionUUID,
      } = action || {
        interaction: null,
        page: null,
        request: null,
        uuid: null,
      };

      let actionFunction = (results: KeyValueType = {}) => {};

      if (page) {
        const {
          external,
          open_new_window: openNewWindow,
          path: pathInit,
        } = page || {
          external: false,
          openNewWindow: false,
          path: null,
        };

        if (pathInit) {
          actionFunction = (results: KeyValueType = {}) => {
            const actionCopy = updateActionFromUpstreamResults(action, results);
            const path = interpolatePagePath(actionCopy?.page);

            let result = null;
            if (external) {
              if (openNewWindow && typeof window !== 'undefined') {
                result = window.open(path, '_blank');
              } else {
                result = window.location.href = path;
              }
            } else {
              if (openNewWindow && typeof window !== 'undefined') {
                result = window.open(path, '_blank');
              } else {
                result = router.push(path);
              }
            }

            if (refItems?.current?.[focusedItemIndex]?.actionResults?.[actionUUID || index]) {
              refItems.current[focusedItemIndex].actionResults[actionUUID || index].result = result;
            }

            return result;
          };
        }
      } else if (interaction) {
        const {
          element,
          type,
        } = interaction || {
          element: null,
          event: null,
        };

        // TODO (dangerous): open the file and the file editor in an application on the same page;
        // this will be supported when Application Center is launched.
        if (CommandCenterActionInteractionTypeEnum.OPEN_FILE === type) {
          actionFunction = (results: KeyValueType = {}) => {
            const actionCopy = updateActionFromUpstreamResults(action, results);

            const { options } = actionCopy?.interaction || { options: null };

            return router.push({
              pathname: '/files',
              query: {
                file_path: typeof options?.file_path === 'string'
                  ? encodeURIComponent(String(options?.file_path))
                  : null,
              },
            });
          };
        } else if (element && type) {
          const { options } = interaction || { options: null };

          actionFunction = (results: KeyValueType = {}) => {
            const nodes = [];
            if (element?.id) {
              const node = document.getElementById(element?.id);
              nodes.push(node);
            } else if (element?.class_name) {
              const node = document.getElementsByClassName(element?.class_name);
              nodes.push(node);
            }

            const result = nodes?.map((node) => {
              if (node) {
                if (options) {
                  return node?.[type]?.(options);
                } else {
                  return node?.[type]?.();
                }
              }
            });

            refItems.current[focusedItemIndex].actionResults[actionUUID || index].result = result;

            return result;
          };
        }
      } else if (request?.operation && request?.resource) {
        actionFunction = (results: KeyValueType = {}) => invokeRequest({
          action,
          focusedItemIndex,
          index,
          item,
          results,
        });
      }

      actionSettings.push({
        action,
        actionFunction,
      });
    });

    const invokeActionAndCallback = (index: number, results: KeyValueType = {}) => {
      const {
        action,
        actionFunction,
      } = actionSettings?.[index];
      const {
        delay,
        uuid,
      } = action;

      const result = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(actionFunction(results));
        }, delay || 0);
      });

      return result?.then((resultsInner) => {
        if (index + 1 <= actionSettings?.length - 1) {
          return invokeActionAndCallback(index + 1, {
            ...results,
            [uuid]: resultsInner,
          });
        }
      });
    };

    if (actionSettings?.length >= 1) {
      return invokeActionAndCallback(0);
    }
  }

  return executeAction;
}
