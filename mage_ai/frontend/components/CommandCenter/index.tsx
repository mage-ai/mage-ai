import { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import ApplicationFooter from './ApplicationFooter';
import Button from '@oracle/elements/Button';
import Footer from './Footer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import ItemApplication from './ItemApplication';
import ItemRow from './ItemRow';
import Loading from '@oracle/components/Loading';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import useCache from '@storage/CommandCenter/useCache';
import { ArrowLeft } from '@oracle/icons';
import {
  CommandCenterActionInteractionTypeEnum,
  CommandCenterActionRequestType,
  CommandCenterActionType,
  CommandCenterItemType,
  ItemTypeEnum,
  KeyValueType,
  ObjectTypeEnum,
  getButtonLabel,
} from '@interfaces/CommandCenterType';
import {
  APPLICATION_FOOTER_ID,
  ApplicationContainerStyle,
  ApplicationFooterStyle,
  COMPONENT_UUID,
  ContainerStyle,
  FOOTER_ID,
  FooterStyle,
  FooterWraperStyle,
  HEADER_ID,
  HeaderContainerStyle,
  HeaderStyle,
  ITEMS_CONTAINER_UUID,
  ITEM_CONTEXT_CONTAINER_ID,
  InputContainerStyle,
  InputStyle,
  ItemsContainerStyle,
  LoadingStyle,
  MAIN_TEXT_INPUT_ID,
  SHARED_PADDING,
} from './index.style';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
  KEY_CODE_ARROW_UP,
  KEY_CODE_BACKSPACE,
  KEY_CODE_DELETE,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_META_LEFT,
  KEY_CODE_META_RIGHT,
  KEY_CODE_PERIOD,
  KEY_SYMBOL_ESCAPE,
} from '@utils/hooks/keyboardShortcuts/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { InputElementEnum, ItemRowClassNameEnum } from './constants';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { addClassNames, removeClassNames } from '@utils/elements';
import {
  addSearchHistory,
  getPageHistoryAsItems,
  getSearchHistory,
  getSetSettings,
} from '@storage/CommandCenter/utils';
import { combineAndSetCachedItems } from '@storage/CommandCenter/cache';
import {
  executeButtonActions,
  filterItems,
  updateActionFromUpstreamResults,
} from './utils';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { setNested } from '@utils/hash';
import { sum } from '@utils/array';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

function CommandCenter() {
  const router = useRouter();
  const [showError, hideError, refError] = useError(null, {}, [], {
    uuid: COMPONENT_UUID,
  });

  const refActive = useRef(false);
  const refFocusedElement = useRef(null);
  const refReload = useRef(null);
  const refSettings = useRef(null);

  const refContainer = useRef(null);
  const refHeader = useRef(null);
  const refLoading = useRef(null);
  const refInput = useRef(null);
  const refInputValuePrevious = useRef(null);

  const refRootFooter = useRef(null);
  const refFooter = useRef(null);
  const refFooterButtonEnter = useRef(null);
  const refFooterButtonEscape = useRef(null);
  const refFooterButtonUp = useRef(null);

  const refRootItems = useRef(null);
  const refItems = useRef([]);
  const refItemsInit = useRef(null);
  const refItemsNodes = useRef({});
  const refItemsNodesContainer = useRef(null);

  const refFocusedItemIndex = useRef(null);
  const refFocusedSearchHistoryIndex = useRef(null);
  const refSelectedSearchHistoryIndex = useRef(null);

  const refRootApplications = useRef(null);
  const refRootApplicationsFooter = useRef(null);
  const refApplications = useRef(null);
  const refApplicationsNodesContainer = useRef(null);
  const refApplicationsFooter = useRef(null);
  const refApplicationState = useRef(null);

  function startLoading() {
    if (refLoading?.current) {
      refLoading.current.className = removeClassNames(
        refLoading?.current?.className || '',
        [
          'inactive',
        ],
      );
    }
  }

  function stopLoading() {
    if (refLoading?.current) {
      refLoading.current.className = addClassNames(
        refLoading?.current?.className || '',
        [
          'inactive',
        ],
      );
    }
  }

  function removeApplication() {
    const count = refApplications?.current?.length || 0;
    if (refApplications?.current === null || !count) {
      return;
    }

    refApplications.current = refApplications?.current?.slice(1, count);

    if (count === 1) {
      [
        refHeader,
        refInput,
        refItemsNodesContainer,
        refApplicationsNodesContainer,
        refFooter,
        refApplicationsFooter,
      ].forEach((r) => {
        if (r?.current) {
          r.current.className = addClassNames(
            r?.current?.className || '',
            [
              'inactive',
            ],
          );

          r.current.className = removeClassNames(
            r?.current?.className || '',
            [
              'active',
            ],
          );
        }
      });

      refInput?.current?.focus();
    }
  }

  function addApplication(
    item: CommandCenterItemType,
    focusedItemIndex: number,
    executeAction: (item: CommandCenterItemType, focusedItemIndex: number) => Promise<any>,
  ) {
    if (refApplications?.current === null) {
      refApplications.current = [];
    }

    refApplications.current.push({
      executeAction,
      focusedItemIndex,
      item,
    });

    [
      refHeader,
      refInput,
      refApplicationsNodesContainer,
      refItemsNodesContainer,
      refFooter,
      refApplicationsFooter,
    ].forEach((r) => {
      if (r?.current) {
        r.current.className = addClassNames(
          r?.current?.className || '',
          [
            'active',
          ],
        );
        r.current.className = removeClassNames(
          r?.current?.className || '',
          [
            'inactive',
          ],
        );
      }
    });

    // Application
    if (!refRootApplications?.current) {
      const domNode = document.getElementById(ITEM_CONTEXT_CONTAINER_ID);
      refRootApplications.current = createRoot(domNode);
    }

    refRootApplications?.current?.render(
      <ItemApplication
        applicationState={refApplicationState}
        executeAction={executeAction}
        focusedItemIndex={focusedItemIndex}
        item={item}
        refError={refError}
        removeApplication={removeApplication}

      />
    );

    // Footer for application
    if (!refRootApplicationsFooter?.current) {
      const domNode = document.getElementById(APPLICATION_FOOTER_ID);
      refRootApplicationsFooter.current = createRoot(domNode);
    }

    refRootApplicationsFooter?.current?.render(
      <ApplicationFooter
        applicationState={refApplicationState}
        executeAction={executeAction}
        focusedItemIndex={focusedItemIndex}
        item={item}
        refError={refError}
        removeApplication={removeApplication}
      />
    );
  }

  function isApplicationActive(): boolean {
    return refApplications?.current?.length >= 1;
  }

  const refKeyDownCode = useRef(null);

  const [reload, setReload] = useState(null);

  function removeFocusFromCurrentItem() {
    const indexPrev = refFocusedItemIndex?.current;
    if (indexPrev !== null) {
      const itemPrev = refItems?.current?.[indexPrev];
      const nodePrev = refItemsNodes?.current?.[itemPrev?.uuid]?.current;
      if (nodePrev) {
        nodePrev.className = removeClassNames(
          nodePrev?.className || '',
          [
            'focused',
          ],
        );
      }
    }
  }

  function handleNavigation(index: number) {
    const itemsContainer = refItemsNodesContainer?.current;
    // 400
    const itemsContainerHeight =
      itemsContainer?.getBoundingClientRect()?.height - (SHARED_PADDING * 2);
    // 44 * 14 = 616
    const itemRowHeightTotal = sum(Object.values(
      refItemsNodes?.current || {},
      // @ts-ignore
    )?.map(refItem => refItem?.current?.getBoundingClientRect()?.height || 0));
    // 216
    const scrollTopTotal = itemRowHeightTotal - itemsContainerHeight;
    // 0 -> 216
    const currentScrollTop = itemsContainer?.scrollTop;

    if (index !== null) {
      const item = refItems?.current?.[index];
      let nodeYBottom = 0;
      let nodeYTop = 0;

      refItems?.current?.slice(0, index + 1)?.forEach((itemInner, idx: number) => {
        const nodeInner = refItemsNodes?.current?.[itemInner?.uuid]?.current;
        const nodeHeight = nodeInner?.getBoundingClientRect()?.height || 0;

        nodeYBottom += nodeHeight;
        nodeYTop += nodeHeight;

        if (idx === index) {
          nodeYTop -= nodeHeight;
        }
      });

      let diff = null;

      // Scroll into view if the node is not currently in the ItemsContainer view.
      if (nodeYBottom > itemsContainerHeight + currentScrollTop) {
        diff = nodeYBottom - itemsContainerHeight;
      } else if (nodeYTop < currentScrollTop) {
        diff = currentScrollTop - (currentScrollTop - nodeYTop);
      }

      if (diff !== null) {
        itemsContainer.scrollTop = Math.max(diff, 0);
      }

      if (refFocusedItemIndex?.current !== null) {
        removeFocusFromCurrentItem();
      }

      refFocusedItemIndex.current = index;
      const itemNext = refItems?.current?.[index];
      const nodeNext = refItemsNodes?.current?.[itemNext?.uuid]?.current;
      if (nodeNext) {
        nodeNext.className = addClassNames(
          nodeNext?.className || '',
          [
            'focused',
          ],
        );
      }

      if (refFooterButtonUp?.current) {
        if (index === 0
          && refFocusedSearchHistoryIndex?.current === null
          && refSelectedSearchHistoryIndex.current === null
        ) {
          refFooterButtonUp.current.innerText = 'Recent';
        } else {
          refFooterButtonUp.current.innerText = 'Up';
        }
      }

      if (refFooterButtonEscape?.current) {
        if (refFocusedSearchHistoryIndex?.current !== null
          || refSelectedSearchHistoryIndex.current !== null
        ) {
          refFooterButtonEscape.current.innerText = 'All';
        } else if (refApplications?.current !== null) {
          refFooterButtonEscape.current.innerText = 'Back';
        } else {
          refFooterButtonEscape.current.innerText = 'Close';
        }
      }

      if (refFooterButtonEnter?.current) {
        if (item) {
          refFooterButtonEnter.current.innerText = getButtonLabel(item) || 'Select';
        } else {
          refFooterButtonEnter.current.innerText = 'Select';
        }
      }
    }
  }

  const [
    invokeRequest,
    {
      isLoading: isLoadingRequest,
    },
  ] = useMutation(
    ({
      action,
      results,
    }: {
      action: CommandCenterActionType;
      focusedItemIndex: number;
      index: number;
      item: CommandCenterItemType;
      results: KeyValueType;
    }) => {
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
      } else if (OperationTypeEnum.DETAIL) {
        submitRequest = () => endpoint?.detailAsync(...ids, query);
      } else if (OperationTypeEnum.LIST) {
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
      ) => onSuccess(
        response, {
          callback: (
            resp: {
              [key: string]: KeyValueType;
            },
          ) => {
            const {
              focusedItemIndex,
              index,
              action: {
                request: {
                  operation,
                  response_resource_key: responseResourceKey,
                }
              },
            } = variables;

            const value = resp?.[responseResourceKey];
            const key = OperationTypeEnum.LIST === operation ? 'models' : 'model';

            if (refItems?.current?.[focusedItemIndex]?.actionResults?.[index]) {
              refItems.current[focusedItemIndex].actionResults[index][key] = value;
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  function executeAction(item: CommandCenterItemType, focusedItemIndex: number) {
    const actionSettings = [];

    if (!item?.actionResults) {
      if (!refItems?.current?.[focusedItemIndex]) {
        refItems.current[focusedItemIndex] = item;
      }

      refItems.current[focusedItemIndex].actionResults = {};
    }

    item?.actions?.forEach((actionInit, index: number) => {
      let action = { ...actionInit };
      const applicationState = (refApplicationState?.current || {})?.[action?.uuid];
      if (applicationState) {
        Object.entries(applicationState || {})?.forEach(([key, value]) => {
          setNested(action, key, value);
        });
      }

      if (!refItems?.current?.[focusedItemIndex]?.actionResults) {
        try {
          refItems.current[focusedItemIndex].actionResults[index] = {
            action,
          };
        } catch (error) {
          console.error('CommandCenter/index.executeAction: ', error);
        }
      }

      const {
        interaction,
        page,
        request,
      } = action || {
        interaction: null,
        page: null,
        request: null,
      };

      let actionFunction = (results: KeyValueType = {}) => {};

      if (page) {
        const {
          external,
          open_new_window: openNewWindow,
          path,
        } = page || {
          external: false,
          openNewWindow: false,
          path: null,
        };

        if (path) {
          actionFunction = (results: KeyValueType = {}) => {
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

            if (refItems?.current?.[focusedItemIndex]?.actionResults?.[index]) {
              refItems.current[focusedItemIndex].actionResults[index].result = result;
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

            refItems.current[focusedItemIndex].actionResults[index].result = result;

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

  function handleSelectItemRow(item: CommandCenterItemType, focusedItemIndex: number) {
    if (item?.application) {
      addApplication(item, focusedItemIndex, executeAction);
    } else {
      return executeAction(item, focusedItemIndex);
    }
  }

  function renderItems(items: CommandCenterItemType[], setInit: boolean = false): Promise<any> {
    refItems.current = items;

    if (setInit && refItemsInit?.current === null) {
      refItemsInit.current = items;
    }

    if (!refRootItems?.current) {
      const domNode = document.getElementById(ITEMS_CONTAINER_UUID);
      refRootItems.current = createRoot(domNode);
    }

    const itemsEl = refItems?.current?.map((item: CommandCenterItemType, index: number) => {
      const refItem = refItemsNodes?.current?.[item?.uuid] || createRef();
      refItemsNodes.current[item?.uuid] = refItem;

      return (
        <ItemRow
          className={ItemRowClassNameEnum.ITEM_ROW}
          item={item}
          key={item.uuid}
          onClick={(e) => {
            pauseEvent(e);
            if (refFocusedItemIndex?.current === index) {
              handleSelectItemRow(item, index);
            } else {
              handleNavigation(index);
            }

            refInput?.current?.focus();
          }}
          ref={refItem}
        />
      );
    });

    refRootItems?.current?.render(itemsEl);

    return new Promise((resolve, reject) => resolve?.(items));
  }

  function combineFilterRender(items: CommandCenterItemType[] = null, setInit: boolean = false) {
    // What is this used for?
    // refItems?.current
    const combined = combineAndSetCachedItems(items);
    const filtered = filterItems(refInput?.current?.value, combined);

    return renderItems(filtered, setInit);
  }

  const {
    fetch: fetchItems,
    isLoading: isLoadingFetch,
  } = useCache({
    searchRef: refInput,
    onSuccessCallback: ({
      command_center_item,
    }) => {
      combineFilterRender(command_center_item?.items, refItemsInit?.current === null);
      refSettings.current = getSetSettings(command_center_item?.settings || {});
    },
    onErrorCallback: (response, errors) => showError({
      errors,
      response,
    }),
  });

  useEffect(() => {
    if (isLoadingFetch || isLoadingRequest) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [
    isLoadingFetch,
    isLoadingRequest,
  ]);

  function closeCommandCenter() {
    refContainer.current.className = addClassNames(
      refContainer?.current?.className || '',
      [
        'hide',
      ],
    );

    refFocusedElement.current = null;
    refInput?.current?.blur();
    refActive.current = false;
  }

  function openCommandCenter() {
    refContainer.current.className = removeClassNames(
      refContainer?.current?.className || '',
      [
        'hide',
      ],
    );

    refInput?.current?.focus();

    if (refFocusedItemIndex?.current === null && refItems?.current?.length >= 1) {
      setTimeout(() => handleNavigation(0), 1);
    }

    refActive.current = true;

    fetchItems();
  }

  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    registerOnKeyUp,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(COMPONENT_UUID);
    unregisterOnKeyUp(COMPONENT_UUID);
  }, [unregisterOnKeyDown, unregisterOnKeyUp, COMPONENT_UUID]);

  registerOnKeyUp(COMPONENT_UUID, () => {
    refKeyDownCode.current = null;
  }, []);

  registerOnKeyDown(COMPONENT_UUID, (event, keyMapping, keyHistory) => {
    function starSequenceValid(): boolean {
      // Show the command center and focus on the text input.
      const ks = refSettings?.current?.interface?.keyboard_shortcuts?.main;

      if (ks?.length >= 1) {
        return onlyKeysPresent(ks, keyMapping);
      } else {
        return onlyKeysPresent([KEY_CODE_META_RIGHT, KEY_CODE_PERIOD], keyMapping)
          || onlyKeysPresent([KEY_CODE_META_LEFT, KEY_CODE_PERIOD], keyMapping);
      }

      return false;
    }

    if (starSequenceValid()) {
      pauseEvent(event);
      if (!!refActive?.current) {
        closeCommandCenter();
      } else {
        openCommandCenter();
      }
    } else if (isApplicationActive()) {
      const app = refApplications?.current?.[0] || {};
      const { item } = app || {};

      // If in a context of a selected item.
      // Leave the current context and go back.
      if (onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping) && !refError?.current) {
        pauseEvent(event);
        removeApplication();
      } else if (item?.application && !refError?.current) {
        item?.application?.buttons?.forEach((button) => {
          const {
            keyboard_shortcuts: keyboardShortcuts,
          } = button;

          keyboardShortcuts?.forEach((keyCodes) => {
            if (onlyKeysPresent(keyCodes, keyMapping)) {
              pauseEvent(event);

              return executeButtonActions({
                button,
                refError,
                removeApplication,
                ...app,
              });
            }
          });
        });
      }
    } else if (InputElementEnum.MAIN === refFocusedElement?.current) {
      // If the main input is active.
      const focusedItemIndex = refFocusedItemIndex?.current;

      if (onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping) && !refError?.current) {
        pauseEvent(event);

        // If there is text in the input, clear it.
        if (refInput?.current?.value?.length >= 1) {
          refInput.current.value = '';

          if (refFocusedSearchHistoryIndex?.current !== null
            || refSelectedSearchHistoryIndex?.current !== null
          ) {
            refFocusedSearchHistoryIndex.current = null;
            refSelectedSearchHistoryIndex.current = null
          }

          // Reset the items to the original list of items.
          removeFocusFromCurrentItem();
          renderItems(refItemsInit?.current || []);
          setTimeout(() => handleNavigation(0), 1);
        } else {
          // If there is no text in the input, close.
          closeCommandCenter();
        }
      } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping)
        && focusedItemIndex !== null
        && !refError?.current
      ) {
        pauseEvent(event);
        // Pressing enter on an item
        const itemSelected = refItems?.current?.[focusedItemIndex];

        const searchText = refInput?.current?.value;
        if (searchText?.length >= 1) {
          addSearchHistory(searchText, itemSelected, refItems?.current);
        }

        handleSelectItemRow(itemSelected, focusedItemIndex);
      } else if (
        onlyKeysPresent([KEY_CODE_BACKSPACE], keyMapping)
          || onlyKeysPresent([KEY_CODE_DELETE], keyMapping)
      ) {
        if (refSelectedSearchHistoryIndex?.current !== null) {
          refSelectedSearchHistoryIndex.current = null;
        }
        if (refFocusedSearchHistoryIndex?.current !== null) {
          refFocusedSearchHistoryIndex.current = null;
        }
      } else {
        let index = null;
        // Arrow down
        if (onlyKeysPresent([KEY_CODE_ARROW_DOWN], keyMapping)) {
          pauseEvent(event);

          if (refFocusedSearchHistoryIndex?.current !== null) {
            refSelectedSearchHistoryIndex.current = refFocusedSearchHistoryIndex.current;
            refFocusedSearchHistoryIndex.current = null;
          }

          // If already on the last item, don’t change
          if (focusedItemIndex <= refItems?.current?.length - 2) {
            index = focusedItemIndex + 1;
          } else {
            index = focusedItemIndex;
          }
          // Arrow up
        } else if (onlyKeysPresent([KEY_CODE_ARROW_UP], keyMapping)) {
          pauseEvent(event);
          // If already on the first item, don’t change.
          // Next time they go up, show recently searched items.

          const firstKeyDown = refKeyDownCode?.current === null;
          refKeyDownCode.current = keyHistory?.[0];

          if (focusedItemIndex >= 1) {
            index = focusedItemIndex - 1;
          } else if ((firstKeyDown || refFocusedSearchHistoryIndex?.current !== null)
            && refSelectedSearchHistoryIndex?.current === null
          ) {
            const arr = getSearchHistory() || [];
            let index2 = refFocusedSearchHistoryIndex?.current === null
              ? -1
              : refFocusedSearchHistoryIndex?.current;

            if (index2 < (arr?.length || 0) - 1) {
              index2 += 1;
              refFocusedSearchHistoryIndex.current = index2;

              const searchItem = arr?.[index2];
              if (searchItem) {
                if (refInput?.current) {
                  refInput.current.value = searchItem?.searchText;
                }

                if (searchItem?.items) {
                  removeFocusFromCurrentItem();
                  renderItems(searchItem?.items || []);
                  setTimeout(() => handleNavigation(0), 1);
                }
              }
            }
          }
        }

        if (index !== null) {
          handleNavigation(index);
        }
      }
    }
  }, [
    fetchItems,
    reload,
  ]);

  useEffect(() => {
    if (refReload?.current === null) {
      setReload(prev => prev === null ? 0 : prev + 1);
    }
  }, []);

  useEffect(() => {
    if (reload !== null) {
      combineFilterRender();
      fetchItems();
      refReload.current = (refReload?.current || 0) + 1;
    }
  }, [reload]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      let isOutside = true;
      // @ts-ignore
      if (refContainer?.current) {
        if (refContainer?.current?.contains?.(e.target)) {
          isOutside = false;
        } else {
          const {
            clientX,
            clientY,
          } = e;
          const {
            height,
            width,
            x,
            y,
          } = refContainer?.current?.getBoundingClientRect() || {};

          isOutside = clientX > (x + width)
            || clientX < x
            || clientY > (y + height)
            || clientY < y;
        }
      }

      if (isOutside) {
        closeCommandCenter();
      } else {
        if (refFocusedItemIndex?.current === null && refItems?.current?.length >= 1) {
          handleNavigation(0);
        }
        refInput?.current?.focus();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    }
  }, []);

  return (
    <ContainerStyle
      // className="hide"
      ref={refContainer}
    >
      <InputContainerStyle>
        <HeaderContainerStyle>
          <HeaderStyle
            className="inactive"
            id={HEADER_ID}
            ref={refHeader}
          >
            <Button
              borderLess
              iconOnly
              noBackground
              onClick={() => removeApplication()}
              outline
            >
              <ArrowLeft size={2 * UNIT} />
            </Button>

            <Spacing mr={1} />

            <KeyboardTextGroup
              addPlusSignBetweenKeys
              keyTextGroups={[[KEY_SYMBOL_ESCAPE]]}
              monospace
            />
          </HeaderStyle>

          <InputStyle
            autoComplete="off"
            className="inactive"
            id={MAIN_TEXT_INPUT_ID}
            onChange={(e) => {
              // There is no need to set refInput.current.value = searchText,
              // this is already done when typing in the input element.
              const searchText = e.target.value;
              const isRemoving = searchText?.length < refInputValuePrevious?.current?.length;

              refInputValuePrevious.current = searchText;

              removeFocusFromCurrentItem();
              combineFilterRender(refItemsInit?.current);
              fetchItems(300);

              setTimeout(() => handleNavigation(0), 1);

              if (isRemoving) {
                refSelectedSearchHistoryIndex.current = null;
                refFocusedSearchHistoryIndex.current = null;
              } else if (refFocusedSearchHistoryIndex?.current !== null) {
                refSelectedSearchHistoryIndex.current = refFocusedSearchHistoryIndex.current;
                refFocusedSearchHistoryIndex.current = null;
              }
            }}
            onFocus={() => {
              refFocusedElement.current = InputElementEnum.MAIN;
            }}
            onBlur={() => {
              refFocusedElement.current = null;
            }}
            placeholder="Search actions, apps, files, blocks, pipelines, triggers"
            ref={refInput}
          />
        </HeaderContainerStyle>
      </InputContainerStyle>

      <ItemsContainerStyle
        className="inactive"
        id={ITEMS_CONTAINER_UUID}
        ref={refItemsNodesContainer}
      >
      </ItemsContainerStyle>

      <ApplicationContainerStyle
        className="inactive"
        id={ITEM_CONTEXT_CONTAINER_ID}
        ref={refApplicationsNodesContainer}
      />

      <FooterWraperStyle>
        <LoadingStyle
          className="inactive"
          ref={refLoading}
        >
          <Loading width="100%" />
        </LoadingStyle>

        <FooterStyle
          className="inactive"
          id={FOOTER_ID}
          ref={refFooter}
        >
          <Footer
            closeCommandCenter={closeCommandCenter}
            handleNavigation={(increment: number) => {
              if (increment >= 1) {
                handleNavigation(Math.min(
                  refItems?.current?.length - 1,
                  refFocusedItemIndex?.current + increment,
                ));
              } else if (increment <= -1) {
                handleNavigation(Math.max(
                  0,
                  refFocusedItemIndex?.current + increment,
                ));
              }
            }}
            handleSelectItemRow={() => handleSelectItemRow(
              refItems?.current?.[refFocusedItemIndex?.current],
              refFocusedItemIndex?.current,
            )}
            refFooterButtonEnter={refFooterButtonEnter}
            refFooterButtonEscape={refFooterButtonEscape}
            refFooterButtonUp={refFooterButtonUp}
          />
        </FooterStyle>

        <ApplicationFooterStyle
          className="inactive"
          id={APPLICATION_FOOTER_ID}
          ref={refApplicationsFooter}
        />
      </FooterWraperStyle>
    </ContainerStyle>
  );
}

export default CommandCenter;
