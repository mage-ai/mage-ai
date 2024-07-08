import Button, { ButtonProps } from '@mana/elements/Button';
import DashedDivider from '@mana/elements/Divider/DashedDivider';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import MenuManager from '@mana/components/Menu/MenuManager';
import Text from '@mana/elements/Text';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import stylesNavigation from '@styles/scss/components/Menu/NavigationButtonGroup.module.scss';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '@components/v2/Apps/PipelineCanvas/useAppEventsHandler';
import { Code, Builder, CaretDown, CaretLeft } from '@mana/icons';
import { ItemClickHandler, MenuGroupType } from './interfaces';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import { MenuItemType } from '@mana/hooks/useContextMenu';
import { equals, sortByKey } from '@utils/array';
import { getCache, deleteCache, updateCache } from './storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEBUG } from '@components/v2/utils/debug';
import useKeyboardShortcuts, { KeyboardShortcutsProps } from '../../hooks/shortcuts/useKeyboardShortcuts';
import { EventEnum, KeyEnum } from '../../events/enums';

type NavigationButtonGroupProps = {
  buildGroups?: (onClick: ItemClickHandler) => MenuItemType[];
  cacheKey?: string;
  groups?: MenuItemType[];
}
export default function NavigationButtonGroup({
  buildGroups,
  cacheKey,
  groups: groupsProp,
}: NavigationButtonGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedButtonIndex, setSelectedButtonIndex] = useState<number>(null);
  const [selectedGroupsByLevel, setSelectedGroupsByLevel] =
    useState<MenuGroupType[]>(cacheKey ? (getCache(cacheKey) ?? []) : []);

  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target: containerRef,
  });

  useEffect(() => {
    registerCommands({
      open: {
        handler: () => {
          if (selectedButtonIndex === null) {
            let index = 0;
            if (selectedGroupsByLevel?.length >= 1) {
              index = selectedGroupsByLevel?.length - 1;
            }
            setSelectedButtonIndex(index);
          }
        },
        predicate: {
          key: KeyEnum.ARROWDOWN,
          metaKey: true,
        },
      },
    }, {
      uuid: 'navigation-button-group',
    });

    return () => {
      deregisterCommands();
    }
  }, [selectedButtonIndex, deregisterCommands, registerCommands, selectedGroupsByLevel]);

  const handleSelectGroup = useCallback((
    event: MouseEvent,
    item: MenuGroupType,
    handleGroupSelection?: (event: MouseEvent, groups: MenuGroupType[]) => void,
  ) => {
    const {
      groups,
      level,
      uuid,
    } = item;

    let items = [
      ...(groups?.reverse() ?? []),
      item,
    ];
    if (selectedGroupsByLevel?.[selectedGroupsByLevel?.length - 1]?.uuid === uuid) {
      items = items.slice(0, level)
    }

    setSelectedGroupsByLevel(items);
    if (items?.length >= 1) {
      updateCache(cacheKey, items);
    } else {
      deleteCache(cacheKey);
    }

    handleGroupSelection(event, items);

    setSelectedButtonIndex(null);
  }, [cacheKey, selectedGroupsByLevel]);

  const groups = useMemo(() => buildGroups
    ? buildGroups(handleSelectGroup)
    : (groupsProp ?? []), [buildGroups, groupsProp, handleSelectGroup]);

  const handleNavigationUpdate = useCallback((event: CustomAppEvent) => {
    DEBUG.events && console.log('handleNavigationUpdate', event)
    const { defaultGroups } = event?.detail?.options?.kwargs ?? {};

    const startingGroups = groups[0];
    DEBUG.events && console.log('startingGroups', startingGroups)
    const item = defaultGroups?.reduce((prev, curr) => {
      DEBUG.events && console.log('prev', prev, 'curr', curr)
      return prev.items[curr.index] ?? prev.items?.find(i => i.uuid === curr.uuid);
    }, startingGroups);
    DEBUG.events && console.log('item', item)
    item.onClick({} as any, item);
  }, [groups]);

  useAppEventsHandler({} as any, {
    [CustomAppEventEnum.UPDATE_HEADER_NAVIGATION]: handleNavigationUpdate,
  });

  const buttons = useMemo(() => {
    const defaultState = selectedGroupsByLevel === null;

    const countTotal = groups?.length ?? 0;
    const count = selectedGroupsByLevel?.length ?? 0;
    const inner = [];
    const activeIndex = count - 1;

    groups?.slice(0, count + 1)?.forEach(({
      label,
      uuid,
    }, idx: number) => {
      const selected = count >= 1 && idx === Math.min(activeIndex + 1, countTotal - 1);
      const beforeSelected = count >= 1 && idx === Math.min(activeIndex, countTotal - 1);
      const first = idx === 0;
      const last = idx === count;
      const initial = (defaultState && idx === 0);
      const done = idx <= activeIndex;
      const group = done ? selectedGroupsByLevel?.[idx] : null;
      const labelUse = (group as MenuGroupType & {
        name?: string;
      })?.name ?? group?.label ?? label;
      const uuidUse = group?.uuid ?? uuid;

      const divider = (
        <div className={stylesNavigation['diagnoal-line-container']} key={`group-${idx}-divider`}>
          <div className={stylesNavigation['diagonal-line']}>
            <DashedDivider height={1} vertical />
          </div>
        </div>
      );

      if (!first) {
        inner.push(divider)
      }

      inner.push(
        <Link
          activeColorOnHover
          className={[
            stylesNavigation.link,
          ].join(' ')}
          key={`${uuid}-label`}
          nowrap
          onClick={(event: any) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedButtonIndex(
              idx <= selectedGroupsByLevel?.length ? idx : selectedGroupsByLevel?.length);
          }}
          secondary
          semibold={!done || beforeSelected}
          small
          success={beforeSelected}
          wrap
        >
          <Grid
            alignItems="center"
            autoFlow="column"
            className={[
              stylesNavigation.grid,
              selected ? stylesNavigation['selected'] : '',
              done ? stylesNavigation['done'] : '',
              done ? stylesHeader[`done-${idx}`] : '',
            ].filter(Boolean).join(' ')}
            columnGap={8}
            // paddingLeft={11 + (!first && selected ? (last ? 6 : 3) : 0)}
            // paddingRight={5 + (!selected ? 6 : 0)}
            paddingLeft={11}
            paddingRight={11}
            style={{
              zIndex: count - idx,
            }}
          >
            {((typeof labelUse === 'function' ? labelUse?.() : labelUse) || uuidUse)}

            {(selected || initial) && <CaretDown secondary size={10} />}
          </Grid>
        </Link>
      );
    });

    return inner;
  }, [groups, selectedGroupsByLevel]);

  const currentGroupToSelect = useMemo(() => {
    const currentGroup = selectedButtonIndex === null ? null : groups?.[0];
    const openItems = selectedGroupsByLevel?.map(({ index: row, level: column }) => ({
      column,
      row,
    }));
    const itemsByLevel = [groups?.[0]?.items];
    openItems?.reduce((prev: MenuItemType[], curr: { column: number, row: number }) => {
      const arr = prev?.[curr?.row]?.items;
      itemsByLevel.push(arr);
      return arr;
    }, itemsByLevel[0]);
    const currentItems = itemsByLevel?.[selectedButtonIndex] ?? currentGroup?.items;

    return (
      <MenuManager
        direction={LayoutDirectionEnum.RIGHT}
        handleOpen={(prev, levelToClose: number) => {
          const previouslyOpen =
            typeof prev === 'function' ? prev(selectedButtonIndex !== null) : prev;

          if (previouslyOpen && levelToClose === 0) {
            setSelectedButtonIndex(null);
          }
        }}
        isOpen={!!currentGroup}
        items={currentItems}
        key={currentGroup?.uuid}
        // openItems={openItems}
        ref={containerRef}
        uuid={currentGroup?.uuid}
      >
        <div
          className={[
            stylesHeader.button,
            stylesNavigation.button,
          ].join(' ')}
          style={{
            gridTemplateColumns: '',
          }}
        >
          <Grid
            alignItems="center"
            autoColumns="min-content"
            autoFlow="column"
            height="100%"
          >
            {buttons}
          </Grid >
        </div>
      </MenuManager>
    );
  }, [buttons, groups, selectedButtonIndex, selectedGroupsByLevel]);

  return (
    <>
      {currentGroupToSelect}
    </>
  );
}
