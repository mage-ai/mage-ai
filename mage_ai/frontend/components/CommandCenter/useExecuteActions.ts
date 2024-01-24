import {
  CommandCenterActionInteractionTypeEnum,
  CommandCenterActionType,
  CommandCenterItemType,
  KeyValueType,
  ItemApplicationType,
  RenderLocationTypeEnum,
  ValidationTypeEnum,
} from '@interfaces/CommandCenterType';
import { CUSTOM_EVENT_NAME_COMMAND_CENTER } from '@utils/events/constants';
import { FetchItemsType, HandleSelectItemRowType } from './constants';
import { InvokeRequestActionType, InvokeRequestOptionsType } from './ItemApplication/constants';
import {
  conditionallyEncodeValue,
  interpolatePagePath,
  updateActionFromUpstreamResults,
} from './utils';
import { isObject, setNested } from '@utils/hash';
import { DEBUG } from '@utils/environment';

enum ActionResultEnum {
  INVALID = 'invalid',
  SUCCESS = 'success',
}

type ActionResultsWithValidation = {
  action: CommandCenterActionType;
  valid: boolean;
  results: KeyValueType;
  item: CommandCenterItemType;
  error?: KeyValueType;
  data?: KeyValueType;
};

export default function useExecuteActions({
  applicationState: refApplicationState = null,
  closeCommandCenter,
  commandCenterState,
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
  closeCommandCenter: () => void;
  commandCenterState?: {
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
  function validateUpstreamResults(opts: {
    action: CommandCenterActionType;
    item: CommandCenterItemType;
    results: KeyValueType;
  }): boolean {
    let valid = true;

    const {
      action,
      item,
      results,
    } = opts;

    if (action?.validations) {
      action?.validations?.forEach((validation) => {
        if (ValidationTypeEnum.CONFIRMATION === validation) {
          // commandCenterState.current.disableKeyboardShortcuts = true;

          valid = typeof window === 'undefined'
            || window.confirm('Are you sure you want to perform this action?');

          // setTimeout(() => {
          //   commandCenterState.current.disableKeyboardShortcuts = false;
          // }, 1);
        } else if (ValidationTypeEnum.CUSTOM_VALIDATION_PARSERS === validation) {
          if (action?.validation_parsers) {
            valid = action?.validation_parsers?.every(({
              function_body: functionBody,
              positional_argument_names: positionalArgumentNames,
            }) => {
              const buildFunction = new Function(...positionalArgumentNames, functionBody);
              // These objects can be muted. Typically, the action object is being mutated.
              const val = buildFunction(
                item,
                action,
                refApplicationState?.current || {},
                results,
              );

              return val;
            });
          }
        }
      });
    }

    return valid;
  }

  function actionFunctionWrapper(actionFunction: (
    opts: ActionResultsWithValidation,
  ) => ActionResultsWithValidation | ActionResultEnum  | Promise<any>): (opts: ActionResultsWithValidation) => ActionResultsWithValidation | ActionResultEnum  | Promise<any> {
    function inner(opts: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum  | Promise<any> {
      const {
        action,
        item,
        results,
        valid,
      } = (isObject(opts) ? opts : null) || {
        action: null,
        item: null,
        results: null,
        valid: null,
      };

      if (valid === false) {
        return ActionResultEnum.INVALID;
      }

      const actionCopy = updateActionFromUpstreamResults(action, results);

      if (!validateUpstreamResults({ ...opts, action: actionCopy })) {
        return ActionResultEnum.INVALID;
      }

      DEBUG(() => console.log(
        `Executing action: ${action?.uuid}`,
        action,
        item,
        results,
        valid,
      ));

      return actionFunction({
        ...opts,
        action: actionCopy,
      });
    }

    return inner;
  }

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
          setNested(action, key, conditionallyEncodeValue(key, value));
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

      let actionFunction = ({
        results,
        valid,
      }: ActionResultsWithValidation = {
        action: null,
        item: null,
        results: null,
        valid: false,
      }) => {};

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
          actionFunction = actionFunctionWrapper(({
            action,
            item,
            results,
            valid,
          }: ActionResultsWithValidation = {
            action: null,
            item: null,
            results: null,
            valid: false,
          }) => {
            const path = interpolatePagePath(action?.page);

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
                  action,
                  item,
                  value: result,
                },
              ],
            );

            return result;
          });
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
          actionFunction = actionFunctionWrapper(({
            results,
          }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
            const { options } = action?.interaction || { options: null };

            return router.push({
              pathname: '/files',
              query: {
                file_path: typeof options?.file_path === 'string'
                  ? encodeURIComponent(String(options?.file_path))
                  : null,
              },
            });
          });
        } else if (CommandCenterActionInteractionTypeEnum.CLOSE_APPLICATION === type) {
          actionFunction = actionFunctionWrapper(({
            action,
            item,
            results,
          }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
            removeApplication?.({
              application: item?.metadata?.application,
            });

            return ActionResultEnum.SUCCESS;
          });
        } else if (CommandCenterActionInteractionTypeEnum.CLOSE_COMMAND_CENTER === type) {
          actionFunction = actionFunctionWrapper(({
            action,
            item,
            results,
          }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
            closeCommandCenter();

            return ActionResultEnum.SUCCESS;
          });
        } else if (CommandCenterActionInteractionTypeEnum.RESET_FORM === type) {
          if (typeof window !== 'undefined') {
            actionFunction = actionFunctionWrapper(({
              item,
            }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
              const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_COMMAND_CENTER, {
                detail: {
                  actionType: CommandCenterActionInteractionTypeEnum.RESET_FORM ,
                  item,
                },
              });

              window.dispatchEvent(eventCustom);

              return ActionResultEnum.SUCCESS;
            });
          }
        } else if (CommandCenterActionInteractionTypeEnum.SELECT_ITEM === type) {
          actionFunction = actionFunctionWrapper(({
            action,
            item,
            results,
          }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
            const { item: itemToSelect } = action?.interaction || { options: null };

            setNested(
              refItemsActionResults?.current,
              item?.object_type,
              [
                {
                  action,
                  item,
                  value: itemToSelect,
                },
              ],
            );

            if (getItems && handleSelectItemRow) {
              const items = getItems?.() || [];
              const itemIndex = items?.findIndex(({ uuid }) => uuid === itemToSelect?.uuid);

              handleSelectItemRow?.(items?.[itemIndex], itemIndex);
            } else {
              console.log('[ERROR] useExecuteActions: getItems and/or handleSelectItemRow is undefined.');
            }

            return ActionResultEnum.SUCCESS;
          });
        } else if (CommandCenterActionInteractionTypeEnum.FETCH_ITEMS === type) {
          actionFunction = actionFunctionWrapper(({
            action,
          }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
            const { options } = action?.interaction || { options: null };
            fetchItems?.(options);

            return ActionResultEnum.SUCCESS;
          });
        } else if (type && interaction?.element) {
          actionFunction = actionFunctionWrapper(({
            action,
            item,
            results,
          }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
            const { element, options } = action?.interaction || { options: null };

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
                  action,
                  item,
                  value: result,
                },
              ],
            );

            return ActionResultEnum.SUCCESS;
          });
        }
      } else if (request?.operation && request?.resource) {
        actionFunction = actionFunctionWrapper(({
          action,
          item,
          results,
        }: ActionResultsWithValidation): ActionResultsWithValidation | ActionResultEnum | Promise<any> => {
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
                action,
                refApplicationState?.current || {},
                parsedResult,
              );
            });
          }

          return invokeRequest({
            action,
            focusedItemIndex,
            index,
            item,
            results,
          });
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
        render_options: renderOptions,
        request,
        uuid,
      } = action || {
        render_options: null,
      };

      const result = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(actionFunction({
            action,
            item,
            results,
          }));
        }, delay || 0);
      });

      return result?.then((resultsInner: ActionResultsWithValidation | ActionResultEnum) => {
        if (typeof resultsInner !== 'undefined' && ActionResultEnum.INVALID === resultsInner) {
          return ActionResultEnum
        }

        const combined = {
          ...(results || {}),
          [uuid]: !!request ? ((resultsInner as ActionResultsWithValidation)?.data || resultsInner) : resultsInner,
        };

        if (RenderLocationTypeEnum.ITEMS_CONTAINER_AFTER === renderOptions?.location) {
          renderOutput?.({
            action,
            item,
            results: combined,
          });
        }

        if (resultsInner && isObject(resultsInner)) {
          if ((resultsInner as ActionResultsWithValidation)?.error || (resultsInner as ActionResultsWithValidation)?.data?.error) {
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
