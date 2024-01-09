import {
  CommandCenterActionInteractionTypeEnum,
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
  ItemApplicationType,
  RenderLocationTypeEnum,
} from '@interfaces/CommandCenterType';
import { FetchItemsType, HandleSelectItemRowType } from './constants';
import { InvokeRequestActionType, InvokeRequestOptionsType } from './ItemApplication/constants';
import {
  interpolatePagePath,
  updateActionFromUpstreamResults,
} from './utils';
import { isObject, setNested } from '@utils/hash';

export default function useExecuteActions({
  applicationState: refApplicationState = null,
  fetchItems,
  getItems,
  handleSelectItemRow,
  invokeRequest,
  itemsActionResultsRef: refItemsActionResults = null,
  removeApplication,
  renderOutput,
  router,
}: {
  applicationState?: {
    current: KeyValueType;
  };
  getItems?: () => CommandCenterItemType[];
  itemsActionResultsRef?: {
    current: KeyValueType;
  };
  removeApplication?: (opts?: {
    application?: ItemApplicationType;
  }) => void;
  renderOutput?: (opts?: {
    item?: CommandCenterItemType;
    action?: CommandCenterActionType;
    results?: KeyValueType;
  }) => void;
  router: any;
} & FetchItemsType & HandleSelectItemRowType & InvokeRequestActionType): (
  item: CommandCenterItemType,
  focusedItemIndex: number,
  actions?: CommandCenterActionType[],
) => Promise<any> {
  function executeAction(
    item: CommandCenterItemType,
    focusedItemIndex: number,
    actions: CommandCenterActionType[] = null,
  ) {
    const actionSettings = [];

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

            setNested(
              refItemsActionResults?.current,
              item?.object_type,
              [
                {
                  action: actionCopy,
                  item,
                  value: result,
                },
              ],
            );

            return result;
          };
        }
      } else if (interaction) {
        const {
          type,
        } = interaction || {
          type: null,
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
        } else if (CommandCenterActionInteractionTypeEnum.CLOSE_APPLICATION === type) {
          actionFunction = (results: KeyValueType = {}) => {
            const actionCopy = updateActionFromUpstreamResults(action, results);
            const { options } = actionCopy?.interaction || { options: null };

            return removeApplication?.({
              application: item?.metadata?.application,
            });
          };
        } else if (CommandCenterActionInteractionTypeEnum.SELECT_ITEM === type) {
          actionFunction = (results: KeyValueType = {}) => {
            const actionCopy = updateActionFromUpstreamResults(action, results);
            const { item: itemToSelect } = actionCopy?.interaction || { options: null };

            setNested(
              refItemsActionResults?.current,
              item?.object_type,
              [
                {
                  action: actionCopy,
                  item,
                  value: itemToSelect,
                },
              ],
            );

            if (getItems && handleSelectItemRow) {
              const items = getItems?.() || [];
              const itemIndex = items?.findIndex(({ uuid }) => uuid === itemToSelect?.uuid);

              return handleSelectItemRow?.(items?.[itemIndex], itemIndex);
            } else {
              console.log('[ERROR] useExecuteActions: getItems and/or handleSelectItemRow is undefined.');
            }
          };
        } else if (CommandCenterActionInteractionTypeEnum.FETCH_ITEMS === type) {
          actionFunction = (results: KeyValueType = {}) => {
            const actionCopy = updateActionFromUpstreamResults(action, results);
            const { options } = actionCopy?.interaction || { options: null };

            return fetchItems?.(options);
          };
        } else if (type && interaction?.element) {
          actionFunction = (results: KeyValueType = {}) => {
            const actionCopy = updateActionFromUpstreamResults(action, results);
            const { element, options } = actionCopy?.interaction || { options: null };

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

            setNested(
              refItemsActionResults?.current,
              item?.object_type,
              [
                {
                  action: actionCopy,
                  item,
                  value: result,
                },
              ],
            );

            return result;
          };
        }
      } else if (request?.operation && request?.resource) {
        actionFunction = (results: KeyValueType = {}) => {
          const actionCopy = { ...action };

          let parsedResult = {};

          if (action?.application_state_parsers) {
            action?.application_state_parsers?.forEach(({
              function_body: functionBody,
              positional_argument_names: positionalArgumentNames,
            }) => {
              const buildFunction = new Function(...positionalArgumentNames, functionBody);
              // These objects can be muted. Typically, the action object is being mutated.
              parsedResult = buildFunction(
                item,
                actionCopy,
                refApplicationState?.current || {},
                parsedResult,
              );
            });
          }

          return invokeRequest({
            action: actionCopy,
            focusedItemIndex,
            index,
            item,
            results,
          });
        };
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
        render_options: renderOptions,
        uuid,
      } = action || {
        render_options: null,
      };

      const result = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(actionFunction(results));
        }, delay || 0);
      });

      return result?.then((resultsInner) => {
        const combined = {
          ...(results || {}),
          [uuid]: resultsInner,
        };

        if (RenderLocationTypeEnum.ITEMS_CONTAINER_AFTER === renderOptions?.location) {
          renderOutput?.({
            action,
            item,
            results: combined,
          });
        }

        if (resultsInner && isObject(resultsInner)) {
          if (resultsInner?.error || resultsInner?.data?.error) {
            return;
          }
        }

        if (index + 1 <= actionSettings?.length - 1) {
          return invokeActionAndCallback(index + 1, combined);
        }
      });
    };

    if (actionSettings?.length >= 1) {
      return invokeActionAndCallback(0);
    }
  }

  return executeAction;
}
