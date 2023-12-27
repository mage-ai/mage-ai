import { ThemeContext } from 'styled-components';
import { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import ItemRow from './ItemRow';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import {
  CommandCenterActionInteractionTypeEnum,
  CommandCenterActionRequestType,
  CommandCenterItemType,
  KeyValueType,
} from '@interfaces/CommandCenterType';
import {
  ContainerStyle,
  InputContainerStyle,
  InputStyle,
  ItemsContainerStyle,
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
} from '@utils/hooks/keyboardShortcuts/constants';
import { InputElementEnum, ItemRowClassNameEnum } from './constants';
import { ITEMS } from './mocks';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { ThemeType } from '@oracle/styles/themes/constants';
import { addClassNames, removeClassNames } from '@utils/elements';
import { addSearchHistory, getSearchHistory } from '@storage/CommandCenter/utils';
import { filterItems } from './utils';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { sum } from '@utils/array';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

const COMPONENT_UUID = 'CommandCenter';
const ITEMS_CONTAINER_UUID = `${COMPONENT_UUID}/ItemsContainerStyle`;

function CommandCenter() {
  const theme: ThemeType = useContext(ThemeContext);

  const router = useRouter();
  const [showError] = useError(null, {}, [], {
    uuid: COMPONENT_UUID,
  });

  const refContainer = useRef(null);
  const refFocusedElement = useRef(null);
  const refFocusedItemIndex = useRef(null);
  const refFocusedSearchHistoryIndex = useRef(null);
  const refInput = useRef(null);
  const refInputValuePrevious = useRef(null);
  const refItems = useRef([]);
  const refItemsInit = useRef(null);
  const refItemNodes = useRef({});
  const refItemNodesContainer = useRef(null);
  const refReload = useRef(null);
  const refReloadCompleteCount = useRef(null);
  const refRoot = useRef(null);
  const refSelectedSearchHistoryIndex = useRef(null);

  const [reload, setReload] = useState(0);

  const removeFocusFromCurrentItem = useCallback(() => {
    const indexPrev = refFocusedItemIndex?.current;
    if (indexPrev !== null) {
      const itemPrev = refItems?.current?.[indexPrev];
      const nodePrev = refItemNodes?.current?.[itemPrev?.uuid]?.current;
      if (nodePrev) {
        nodePrev.className = removeClassNames(
          nodePrev?.className || '',
          [
            'focused',
          ],
        );
      }
    }
  }, []);

  const handleNavigation = useCallback((index: number) => {
    const itemsContainer = refItemNodesContainer?.current;
    // 400
    const itemsContainerHeight = itemsContainer?.getBoundingClientRect()?.height;
    // 44 * 14 = 616
    const itemRowHeightTotal = sum(Object.values(
      refItemNodes?.current || {},
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
        const nodeInner = refItemNodes?.current?.[itemInner?.uuid]?.current;
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
      const nodeNext = refItemNodes?.current?.[itemNext?.uuid]?.current;
      if (nodeNext) {
        nodeNext.className = addClassNames(
          nodeNext?.className || '',
          [
            'focused',
          ],
        );
      }
    }
  }, [
    removeFocusFromCurrentItem,
  ]);

  const [invokeRequest, { isLoading: isLoadingRequest }] = useMutation(
    ({
      request: {
        operation,
        payload,
        payload_resource_key: payloadResourceKey,
        query,
        resource,
        resource_id: resourceID,
        resource_parent: resourceParent,
        resource_parent_id: resourceParentID,
      },
    }: {
      focusedItemIndex: number;
      index: number;
      item: CommandCenterItemType;
      request: CommandCenterActionRequestType;
    }) => {
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
        submitRequest = () => endpoint?.useCreate(...ids, query)({
          [payloadResourceKey]: payload,
        });
      } else if (OperationTypeEnum.UPDATE === operation) {
        submitRequest = () => endpoint?.useUpdate(...ids, query)({
          [payloadResourceKey]: payload,
        });
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
      onSuccess: (response: any, variables: {
        focusedItemIndex: number;
        index: number;
        item: CommandCenterItemType;
        request: CommandCenterActionRequestType;
      }) => onSuccess(
        response, {
          callback: (
            resp: {
              [key: string]: KeyValueType;
            },
          ) => {
            const {
              focusedItemIndex,
              index,
              request: {
                operation,
                response_resource_key: responseResourceKey,
              }
            } = variables;

            const value = resp?.[responseResourceKey];
            const key = OperationTypeEnum.LIST === operation ? 'models' : 'model';

            refItems.current[focusedItemIndex].actionResults[index][key] = value;
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const handleItemSelect = useCallback((item: CommandCenterItemType, focusedItemIndex: number) => {
    const actions = [];

    if (!item?.actionResults) {
      refItems.current[focusedItemIndex].actionResults = {};
    }

    item?.actions?.forEach((action, index: number) => {
      refItems.current[focusedItemIndex].actionResults[index] = {
        action,
      };

      const {
        delay,
        interaction,
        page,
        request,
      } = action || {
        interaction: null,
        page: null,
        request: null,
      };

      let actionFunction = null;

      if (page) {
        const {
          external,
          openNewWindow,
          path,
        } = page || {
          external: false,
          openNewWindow: false,
          path: null,
        };

        if (path) {
          actionFunction = () => {
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

            refItems.current[focusedItemIndex].actionResults[index].result = result;

            return result;
          };
        }
      } else if (interaction) {
        const {
          element,
          options,
          type,
        } = interaction || {
          element: null,
          event: null,
          options: null,
        };

        // TODO (dangerous): open the file and the file editor in an application on the same page;
        // this will be supported when Application Center is launched.
        if (CommandCenterActionInteractionTypeEnum.OPEN_FILE === type) {
          router.push({
            pathname: '/files',
            query: {
              file_path: options?.file_path
                ? encodeURIComponent(options?.file_path)
                : null,
            },
          });
        } else if (element && type) {
          actionFunction = () => {
            const nodes = [];
            if (element?.id) {
              const node = document.getElementById(element?.id);
              nodes.push(node);
            } else if (element?.className) {
              const node = document.getElementsByClassName(element?.className);
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
      } else if (request) {
        const {
          operation,
          resource,
          response_resource_key: responseResourceKey,
        } = request || {
          operation: null,
          resource: null,
        };

        if (operation && resource) {
          actionFunction = () => invokeRequest({
            focusedItemIndex,
            index,
            item,
            request,
          });
        }
      }

      if (actionFunction) {
        actions.push(new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(actionFunction());
          }, delay || 0);
        }));
      }
    });

    const invokeActionAndCallback = (index: number) => {
      return actions?.[index]?.then((response, variables) => {
        if (index <= actions?.length - 1) {
          return invokeActionAndCallback(index + 1);
        }
      });
    };

    if (actions?.length >= 1) {
      invokeActionAndCallback(0);
    }
  }, [
    invokeRequest,
  ]);

  useEffect(() => {
    if (refReload?.current === null || refReloadCompleteCount?.current === null) {
      refReload.current = 1;
      refReloadCompleteCount.current = 0;
    } else {
      setReload(prev => prev + 1);
    }
  }, []);

  const renderItems = useCallback((items: CommandCenterItemType[]): Promise<any> => {
    removeFocusFromCurrentItem();

    refItems.current = items;

    if (refItemsInit?.current === null) {
      refItemsInit.current = items;
    }

    if (!refRoot?.current) {
      const domNode = document.getElementById(ITEMS_CONTAINER_UUID);
      refRoot.current = createRoot(domNode);
    }

    const itemsEl = refItems?.current?.map((item: CommandCenterItemType, index: number) => {
      const refItem = refItemNodes?.current?.[item?.uuid] || createRef();
      refItemNodes.current[item?.uuid] = refItem;

      return (
        <ItemRow
          className={ItemRowClassNameEnum.ITEM_ROW}
          item={item}
          key={item.uuid}
          onClick={() => {
            handleNavigation(index);
            handleItemSelect(item, index);
          }}
          ref={refItem}
          theme={theme}
        />
      );
    });

    refRoot?.current?.render(itemsEl);

    setTimeout(() => handleNavigation(0), 1);

    return new Promise((resolve, reject) => resolve?.(items));
  }, [
    handleItemSelect,
    handleNavigation,
    removeFocusFromCurrentItem,
    theme,
  ]);

  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(COMPONENT_UUID);
  }, [unregisterOnKeyDown, COMPONENT_UUID]);

  registerOnKeyDown(COMPONENT_UUID, (event, keyMapping, keyHistory) => {
    const focusedItemIndex = refFocusedItemIndex?.current;

    // If the main input is active.
    if (InputElementEnum.MAIN === refFocusedElement?.current) {
      if (onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping)) {
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
          renderItems(refItemsInit?.current || []);
        } else {
          // If there is no text in the input, close.
          refContainer.current.className = addClassNames(
            refContainer?.current?.className || '',
            [
              'hide',
            ],
          );
          refFocusedElement.current = null;
          refInput?.current?.blur();
        }
      } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping) && focusedItemIndex !== null) {
        pauseEvent(event);
        // Pressing enter on an item
        const itemSelected = refItems?.current?.[focusedItemIndex];

        const searchText = refInput?.current?.value;
        if (searchText?.length >= 1) {
          addSearchHistory(searchText, itemSelected, refItems?.current);
        }

        handleItemSelect(itemSelected, focusedItemIndex);
      } else if (
        onlyKeysPresent([KEY_CODE_BACKSPACE], keyMapping)
          || onlyKeysPresent([KEY_CODE_DELETE], keyMapping)
      ) {
        // TBD
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
          }
          // Arrow up
        } else if (onlyKeysPresent([KEY_CODE_ARROW_UP], keyMapping)) {
          pauseEvent(event);
          // If already on the first item, don’t change

          if (focusedItemIndex >= 1) {
            index = focusedItemIndex - 1;
          } else if (refSelectedSearchHistoryIndex?.current === null) {
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
                  renderItems(searchItem?.items || []);;
                }
              }
            }
          }
        }

        if (index !== null) {
          handleNavigation(index);
        }
      }
    } else {
      // Show the command center and focus on the text input.
      if (onlyKeysPresent([KEY_CODE_META_RIGHT, KEY_CODE_PERIOD], keyMapping)
        || onlyKeysPresent([KEY_CODE_META_LEFT, KEY_CODE_PERIOD], keyMapping)
      ) {
        pauseEvent(event);
        refContainer.current.className = removeClassNames(
          refContainer?.current?.className || '',
          [
            'hide',
          ],
        );
        refInput?.current?.focus();

        if (refFocusedItemIndex?.current === null && refItems?.current?.length >= 1) {
          handleNavigation(0);
        }
      }
    }

  }, [reload]);

  useEffect(() => {
    if (refReloadCompleteCount?.current < refReload?.current) {
      renderItems(ITEMS);
      refReloadCompleteCount.current = (refReloadCompleteCount?.current || 0) + 1;
    }
  }, [reload]);

  return (
    <ContainerStyle ref={refContainer}>
      <InputContainerStyle>
        <InputStyle
          onChange={(e) => {
            const searchText = e.target.value;
            const isRemoving = searchText?.length < refInputValuePrevious?.current?.length;

            refInputValuePrevious.current = searchText;

            // There is no need to set refInput.current.value = searchText,
            // this is already done when typing in the input element.
            renderItems(
              filterItems(searchText, refItemsInit?.current || []),
            );

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
      </InputContainerStyle>

      <ItemsContainerStyle
        id={ITEMS_CONTAINER_UUID}
        ref={refItemNodesContainer}
      />
    </ContainerStyle>
  );
}

export default CommandCenter;
