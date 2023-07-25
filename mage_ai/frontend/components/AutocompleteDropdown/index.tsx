import React, {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ItemType,
  ItemGroupType,
} from './constants';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_SHIFT,
  KEY_CODE_TAB,
} from '@utils/hooks/keyboardShortcuts/constants';
import { useKeyboardContext } from '@context/Keyboard';

export type AutocompleteDropdownSharedProps = {
  highlightedItemIndexInitial?: number;
  onMouseEnterItem?: (item: ItemType) => void;
  onMouseLeaveItem?: (item: ItemType) => void;
  onSelectItem: (item: ItemType) => void;
  renderEmptyState?: () => any;
  searchQuery?: string;
  selectedItem?: ItemType;
  uuid: string;
};

export type AutocompleteDropdownProps = {
  itemGroups: ItemGroupType[];
  noResultGroups?: ItemGroupType[];
  onHighlightItemIndexChange?: (idx: number) => void;
  setItemRefs?: (refs: any[]) => void;
} & AutocompleteDropdownSharedProps;

function filterItem(item: ItemType, searchQuery: string) {
  return item
    .searchQueries
    .filter((value: string | number) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .length >= 1;
}

function AutocompleteDropdown({
  highlightedItemIndexInitial = null,
  itemGroups: itemGroupsProp,
  noResultGroups,
  onHighlightItemIndexChange,
  onMouseEnterItem,
  onMouseLeaveItem,
  onSelectItem,
  renderEmptyState,
  searchQuery,
  selectedItem,
  setItemRefs,
  uuid,
}: AutocompleteDropdownProps) {
  const [mouseVisible, setMouseVisible] = useState(true);

  const {
    itemGroups,
    itemsFlattened,
  } = useMemo(() => {
    const itemsFlattenedInternal = [];

    const arr = itemGroupsProp.reduce((acc: ItemGroupType[], itemGroup: ItemGroupType) => {
      const { items } = itemGroup;

      const itemsFiltered = items
        .filter((item: ItemType) => !searchQuery || filterItem(item, searchQuery));

      if (itemsFiltered.length === 0) {
        return acc;
      }

      itemsFlattenedInternal.push(...itemsFiltered);

      return acc.concat({
        ...itemGroup,
        items: itemsFiltered,
      });
    }, []);

    return {
      itemGroups: arr,
      itemsFlattened: itemsFlattenedInternal,
    };
  }, [
    itemGroupsProp,
    searchQuery,
  ]);

  if (noResultGroups && itemsFlattened.length === 0) {
    itemGroups.push(...noResultGroups);
    itemsFlattened.push(...noResultGroups.reduce((acc, { items }) => acc.concat(items), []));
  }

  const itemRefs = useRef(null);
  itemRefs.current = itemsFlattened.map(() => createRef());

  const [highlightedItemIndex, setHighlightedItemIndexState] = useState(highlightedItemIndexInitial);
  const setHighlightedItemIndex = useCallback((idx: number) => {
    onHighlightItemIndexChange?.(idx);
    setHighlightedItemIndexState(idx);
  }, [
    onHighlightItemIndexChange,
    setHighlightedItemIndexState,
  ]);
  const itemHighlighted = itemsFlattened[highlightedItemIndex];

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();
  useEffect(() => () => unregisterOnKeyDown(uuid), [
    unregisterOnKeyDown,
    uuid,
  ]);

  registerOnKeyDown?.(
    uuid,
    (event, keyMapping, keyHistory) => {
      let mouseVisibleNew = true;
      let itemIndex;
      const numberOfItems = itemsFlattened.length;
      const itemIndexForKeyboardShortcut = itemsFlattened
        .findIndex((
          {
            keyboardShortcutValidation,
          }: ItemType,
          idx: number,
        ) => keyboardShortcutValidation?.({
          keyHistory,
          keyMapping,
        }, idx));

      const tabWithoutShift = keyMapping[KEY_CODE_TAB] && !keyMapping[KEY_CODE_SHIFT] && !selectedItem;

      if (itemIndexForKeyboardShortcut !== -1) {
        event.preventDefault();
        onSelectItem(itemsFlattened[itemIndexForKeyboardShortcut]);
        setMouseVisible(mouseVisibleNew);

        return setHighlightedItemIndex(itemIndexForKeyboardShortcut);
      } else if ((keyMapping[KEY_CODE_ENTER] || tabWithoutShift)
          && itemsFlattened[highlightedItemIndex]
      ) {
        if (tabWithoutShift) {
          event.preventDefault();
        }

        onSelectItem(itemsFlattened[highlightedItemIndex]);
        setMouseVisible(mouseVisibleNew);

        return setHighlightedItemIndex(highlightedItemIndex);
      } else if (keyMapping[KEY_CODE_ARROW_UP]) {
        mouseVisibleNew = false;

        if (highlightedItemIndex === null) {
          itemIndex = numberOfItems - 1;
        } else {
          itemIndex = highlightedItemIndex - 1;
        }
      } else if (keyMapping[KEY_CODE_ARROW_DOWN]) {
        mouseVisibleNew = false;

        if (highlightedItemIndex === null) {
          itemIndex = 0;
        } else {
          itemIndex = highlightedItemIndex + 1;
        }
      } else if (keyMapping[KEY_CODE_ESCAPE]) {
        setHighlightedItemIndex(null);
      }

      if (typeof itemIndex !== 'undefined') {
        if (itemIndex >= numberOfItems) {
          itemIndex = 0;
        } else if (itemIndex <= -1) {
          itemIndex = numberOfItems - 1;
        }

        if (itemIndex >= 0 && itemIndex <= numberOfItems - 1) {
          setHighlightedItemIndex(itemIndex);
          event.preventDefault();
        } else {
          setHighlightedItemIndex(null);
        }
      }

      setMouseVisible(mouseVisibleNew);
    },
    [
      highlightedItemIndex,
      itemsFlattened,
      selectedItem,
      setHighlightedItemIndex,
      setMouseVisible,
    ],
  );

  useEffect(() => {
    // @ts-ignore
    setItemRefs?.(itemRefs);
  }, [
    itemRefs,
    itemsFlattened,
    setItemRefs,
  ]);

  useEffect(() => {
    const check =
      (highlightedItemIndex === null || typeof highlightedItemIndex === 'undefined')
        || highlightedItemIndex >= itemsFlattened.length;

    if (searchQuery?.length >= 1 && check) {
      setHighlightedItemIndex(0);
    }
  }, [
    highlightedItemIndex,
    itemsFlattened,
    searchQuery,
    setHighlightedItemIndex,
  ]);

  const handleMouseMove = useCallback(() => setMouseVisible(true), [setMouseVisible]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  if (itemGroups.length === 0 && renderEmptyState) {
    return renderEmptyState();
  }

  return (
    <>
      {itemGroups.map(({
        items,
        renderItem,
        renderGroupHeader,
        uuid,
      }: ItemGroupType, idx1: number) => {
        const allPreviousItemsLength = idx1 >= 1
          ? itemGroups.slice(0, idx1).reduce((acc, { items }) => acc + items.length, 0)
          : 0;

        const itemEls = items
          .map((item: ItemType, idx2: number) => {
            const {
              itemObject,
              value,
            } = item;
            const highlighted = value === itemHighlighted?.value;
            const indexFlattened = idx2 + allPreviousItemsLength;
            const uuid = itemObject?.id || itemObject?.uuid;

            return (
              <div
                id={`item-${value}-${uuid}`}
                key={`item-${value}-${uuid}`}
                onMouseMove={() => mouseVisible && setHighlightedItemIndex(indexFlattened)}
                // @ts-ignore
                ref={itemRefs.current[indexFlattened]}
              >
                {renderItem(item, {
                  highlighted,
                  onClick: () => onSelectItem(item),
                  onMouseEnter: () => onMouseEnterItem?.(item),
                  onMouseLeave: () => onMouseLeaveItem?.(item),
                }, idx2, indexFlattened)}
              </div>
            );
          });

        return itemEls.length >= 1 && (
          <div key={uuid || `group-uuid-${idx1}`}>
            {renderGroupHeader?.()}
            {itemEls}
          </div>
        );
      })}
    </>
  );
}

export default AutocompleteDropdown;
