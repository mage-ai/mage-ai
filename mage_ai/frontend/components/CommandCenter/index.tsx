import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import ItemRow from './ItemRow';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
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
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_META_LEFT,
  KEY_CODE_META_RIGHT,
  KEY_CODE_PERIOD,
} from '@utils/hooks/keyboardShortcuts/constants';
import { InputElementEnum } from './constants';
import { ITEMS } from './mocks';
import { addClassNames, removeClassNames } from '@utils/elements';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { sum } from '@utils/array';
import { useKeyboardContext } from '@context/Keyboard';

function CommandCenter() {
  const router = useRouter();

  const refContainer = useRef(null);
  const refFocusedElement = useRef(null);
  const refFocusedItemIndex = useRef(null);
  const refInput = useRef(null);
  const refItems = useRef({});
  const refItemsContainer = useRef(null);
  const refReload = useRef(null);

  const [reload, setReload] = useState(0);
  const [items, setItems] = useState<CommandCenterTypeEnum[]>(ITEMS);
  const itemsCount = useMemo(() => items?.length || 0, [items]);

  const handleNavigation = useCallback((index: number) => {
    const itemsContainer = refItemsContainer?.current;
    // 400
    const itemsContainerHeight = itemsContainer?.getBoundingClientRect()?.height;
    // 44 * 14 = 616
    const itemRowHeightTotal = sum(Object.values(
      refItems?.current || {},
    )?.map(refItem => refItem?.current?.getBoundingClientRect()?.height || 0));
    // 216
    const scrollTopTotal = itemRowHeightTotal - itemsContainerHeight;
    // 0 -> 216
    const currentScrollTop = itemsContainer?.scrollTop;

    if (index !== null) {
      const item = items?.[index];
      let nodeYBottom = 0;
      let nodeYTop = 0;

      items?.slice(0, index + 1)?.forEach((itemInner, idx: number) => {
        const nodeInner = refItems?.current?.[itemInner?.uuid]?.current;
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

      const indexPrev = refFocusedItemIndex.current;
      const itemPrev = items?.[indexPrev];
      const nodePrev = refItems?.current?.[itemPrev?.uuid]?.current;
      if (nodePrev) {
        nodePrev.className = removeClassNames(
          nodePrev?.className || '',
          [
            'focused',
          ],
        );
      }

      refFocusedItemIndex.current = index;
      const itemNext = items?.[index];
      const nodeNext = refItems?.current?.[itemNext?.uuid]?.current;
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
    items,
  ]);

  const handleItemSelect = useCallback((item: CommandCenterItemType) => {
    console.log('handleItemSelect', item);

    const actions = [];

    item?.actions?.forEach((action) => {
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
            if (external) {
              if (openNewWindow && typeof window !== 'undefined') {
                return window.open(path, '_blank');
              } else {
                return window.location.href = path;
              }
            } else {
              if (openNewWindow && typeof window !== 'undefined') {
                return window.open(path, '_blank');
              } else {
                return router.push(path);
              }
            }
          };
        }
      } else if (interaction) {
        const {
          element,
          eventType,
          eventOptions,
        } = interaction || {
          element: null,
          event: null,
          eventOptions: null,
        };

        if (element && eventType) {
          actionFunction = () => {
            const nodes = [];
            if (element?.id) {
              const node = document.getElementById(element?.id);
              nodes.push(node);
            } else if (element?.className) {
              const node = document.getElementsByClassName(element?.className);
              nodes.push(node);
            }

            nodes?.forEach((node) => {
              if (eventOptions) {
                return node[eventType]?.(eventOptions);
              } else {
                return node[eventType]?.();
              }
            });
          };
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
      console.log(`Invoking action: ${index}`);
      return actions?.[index]?.then(() => {
        if (index <= actions?.length - 1) {
          return invokeActionAndCallback(index + 1);
        }
      });
    };

    if (actions?.length >= 1) {
      invokeActionAndCallback(0);
    }
  }, [
  ]);

  useEffect(() => {
    if (refReload?.current === null) {
      refReload.current = 1;
    } else {
      setReload(prev => prev + 1);
    }
  }, []);

  const uuidKeyboard = 'CommandCenter';
  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(uuidKeyboard, (event, keyMapping, keyHistory) => {
    const focusedItemIndex = refFocusedItemIndex?.current;

    // If the main input is active.
    if (InputElementEnum.MAIN === refFocusedElement?.current) {
      if (onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping)) {
        // If there is text in the input, clear it.
        if (refInput?.current?.value?.length >= 1) {
          refInput.current.value = '';
          handleNavigation(0);
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
        // Pressing enter on an item
        handleItemSelect(items?.[focusedItemIndex]);
      } else {
        let index = null;
        // Arrow down
        if (onlyKeysPresent([KEY_CODE_ARROW_DOWN], keyMapping)) {
          // If already on the last item, don’t change
          if (focusedItemIndex <= itemsCount - 2) {
            index = focusedItemIndex + 1;
          }
          // Arrow up
        } else if (onlyKeysPresent([KEY_CODE_ARROW_UP], keyMapping)) {
          // If already on the first item, don’t change
          if (focusedItemIndex >= 1) {
            index = focusedItemIndex - 1;
          }
        }

        handleNavigation(index);
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
      }
    }

  }, [
    reload,
  ]);

  const itemsMemo = useMemo(() => items?.map((item, index: number) => {
    const refItem = refItems?.current?.[item?.uuid] || createRef();
    refItems.current[item?.uuid] = refItem;

    return (
      <ItemRow
        item={item}
        key={item.uuid}
        ref={refItem}
      />
    );
  }), [
    items,
  ]);

  return (
    <ContainerStyle ref={refContainer}>
      <InputContainerStyle>
        <InputStyle
          onChange={(e) => {
            refInput.current.value = e.target.value;
          }}
          onFocus={() => {
            refFocusedElement.current = InputElementEnum.MAIN;

            if (refFocusedItemIndex?.current === null && items?.length >= 1) {
              handleNavigation(0);
            }
          }}
          placeholder="Search actions, apps, files, blocks, pipelines, triggers"
          ref={refInput}
        />
      </InputContainerStyle>

      <ItemsContainerStyle ref={refItemsContainer}>
        {itemsMemo}
      </ItemsContainerStyle>
    </ContainerStyle>
  );
}

export default CommandCenter;
