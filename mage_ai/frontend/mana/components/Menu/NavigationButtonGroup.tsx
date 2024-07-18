import useCustomEventHandler from '@mana/events/useCustomEventHandler';
import DashedDivider from '@mana/elements/Divider/DashedDivider';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import { useMenuManager } from '@mana/components/Menu/MenuManager';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import stylesNavigation from '@styles/scss/components/Menu/NavigationButtonGroup.module.scss';
import { Code, Builder, CaretDown, CaretLeft } from '@mana/icons';
import { ItemClickHandler, MenuGroupType } from './interfaces';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import { MenuItemType } from '@mana/hooks/useContextMenu';
import { getCache, deleteCache, updateCache } from './storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useKeyboardShortcuts from '../../hooks/shortcuts/useKeyboardShortcuts';

type NavigationButtonGroupProps = {
  buildGroups?: (onClick: ItemClickHandler) => MenuItemType[];
  cacheKey?: string;
  groups?: MenuItemType[];
};
export default function NavigationButtonGroup({
  buildGroups,
  cacheKey,
  groups: groupsProp,
}: NavigationButtonGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedButtonIndexRef = useRef<number | null>(null);
  const [selectedGroupsByLevel, setSelectedGroupsByLevel] = useState<MenuGroupType[]>(
    cacheKey ? (getCache(cacheKey) ?? [])?.filter(Boolean) : [],
  );

  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target: containerRef,
  });

  const { handleToggleMenu, menu } = useMenuManager({
    direction: LayoutDirectionEnum.RIGHT,
    onClose: (levelToClose: number) => {
      if (levelToClose === 0) {
        handleToggleMenu({ items: null, openItems: null });
      }
    },
    ref: containerRef,
    uuid: `NavigationButtonGroup-${cacheKey}`,
  });

  const handleSelectGroup = useCallback(
    (
      event: MouseEvent,
      item: MenuGroupType,
      handleGroupSelection?: (event: MouseEvent, groups: MenuGroupType[]) => void,
    ) => {
      const { groups, level, uuid } = item;

      let items = [...(groups?.reverse() ?? []), item];
      if (selectedGroupsByLevel?.[selectedGroupsByLevel?.length - 1]?.uuid === uuid) {
        items = items.slice(0, level);
      }

      setSelectedGroupsByLevel(items);
      if (items?.length >= 1) {
        updateCache(cacheKey, items);
      } else {
        deleteCache(cacheKey);
      }

      handleGroupSelection(event, items);
      selectedButtonIndexRef.current = null;
      handleToggleMenu({ items: null, openItems: null });
    },
    [cacheKey, handleToggleMenu, selectedGroupsByLevel],
  );

  const groups = useMemo(
    () => (buildGroups ? buildGroups(handleSelectGroup) : groupsProp ?? []),
    [buildGroups, groupsProp, handleSelectGroup],
  );

  const handleNavigationUpdate = useCallback(
    (event: any) => {
      const { defaultGroups } = event?.detail?.options?.kwargs ?? {};

      let groups0 = [];
      if (groups?.length > 0) {
        groups0 = [...groups];
      } else {
        groups0 = [...(buildGroups ? buildGroups(handleSelectGroup) : groupsProp ?? [])];
      }
      const arr = (defaultGroups ?? [])?.map(g => groups0?.find(grp => grp.uuid === g.uuid) ?? g);

      if (arr?.every(Boolean)) {
        updateCache(cacheKey, arr);
        setSelectedGroupsByLevel(arr);
      }
    },
    [cacheKey, buildGroups, groupsProp, handleSelectGroup, groups],
  );

  useCustomEventHandler({} as any, {
    UPDATE_HEADER_NAVIGATION: handleNavigationUpdate,
  });

  const openMenu = useCallback(
    (idx?: number) => {
      const selectedButtonIndex =
        (idx ?? selectedButtonIndexRef.current) <= selectedGroupsByLevel?.length
          ? idx ?? selectedButtonIndexRef.current
          : selectedGroupsByLevel?.length;
      const currentGroup = selectedButtonIndex === null ? null : groups?.[0];
      const openItems = selectedGroupsByLevel?.map(({ index: row, level: column }) => ({
        column,
        row,
      }));
      const itemsByLevel = [groups?.[0]?.items];
      openItems?.reduce((prev: MenuItemType[], curr: { column: number; row: number }) => {
        const arr = prev?.[curr?.row]?.items;
        itemsByLevel.push(arr);
        return arr;
      }, itemsByLevel[0]);
      const currentItems = itemsByLevel?.[selectedButtonIndex] ?? currentGroup?.items;

      handleToggleMenu({
        items: currentItems,
        openItems: openItems?.slice(openItems?.length - 1),
      });
    },
    [groups, handleToggleMenu, selectedGroupsByLevel],
  );

  useEffect(() => {
    registerCommands(
      {
        open: {
          handler: () => {
            if (selectedButtonIndexRef.current === null) {
              let index = 0;
              if (selectedGroupsByLevel?.length >= 1) {
                index = selectedGroupsByLevel?.length - 1;
              }
              selectedButtonIndexRef.current = index;
              openMenu();
            }
          },
          predicate: {
            key: 'ARROWDOWN',
            metaKey: true,
          },
        },
      },
      {
        uuid: 'NavigationButtonGroup',
      },
    );

    return () => {
      deregisterCommands();
    };
  }, [deregisterCommands, openMenu, registerCommands, selectedGroupsByLevel]);

  const buttons = useMemo(() => {
    const defaultState = selectedGroupsByLevel === null;

    const countTotal = groups?.length ?? 0;
    const count = selectedGroupsByLevel?.length ?? 0;
    const inner = [];
    const activeIndex = count - 1;

    groups?.slice(0, count + 1)?.forEach(({ label, uuid }, idx: number) => {
      const selected = count >= 1 && idx === Math.min(activeIndex + 1, countTotal - 1);
      const beforeSelected = count >= 1 && idx === Math.min(activeIndex, countTotal - 1);
      const first = idx === 0;
      const last = idx === count;
      const initial = defaultState && idx === 0;
      const done = idx <= activeIndex;
      const group = done ? selectedGroupsByLevel?.[idx] : null;
      const labelUse =
        (
          group as MenuGroupType & {
            name?: string;
          }
        )?.name ??
        group?.label ??
        label;
      const uuidUse = group?.uuid ?? uuid;

      const divider = (
        <div className={stylesNavigation['diagnoal-line-container']} key={`group-${idx}-divider`}>
          <div className={stylesNavigation['diagonal-line']}>
            <DashedDivider height={1} vertical />
          </div>
        </div>
      );

      if (!first) {
        inner.push(divider);
      }

      inner.push(
        <Link
          activeColorOnHover
          className={[stylesNavigation.link].join(' ')}
          key={`${uuid}-label`}
          nowrap
          onClick={(event: any) => {
            event.preventDefault();
            event.stopPropagation();
            selectedButtonIndexRef.current = idx;
            openMenu();
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
            ]
              .filter(Boolean)
              .join(' ')}
            columnGap={8}
            // paddingLeft={11 + (!first && selected ? (last ? 6 : 3) : 0)}
            // paddingRight={5 + (!selected ? 6 : 0)}
            paddingLeft={11}
            paddingRight={11}
            style={{
              zIndex: count - idx,
            }}
          >
            {(typeof labelUse === 'function' ? labelUse?.() : labelUse) || uuidUse}

            {(selected || initial) && <CaretDown secondary size={10} />}
          </Grid>
        </Link>,
      );
    });

    return inner;
  }, [groups, openMenu, selectedGroupsByLevel]);

  return (
    <>
      <div
        className={[stylesHeader.button, stylesNavigation.button].join(' ')}
        ref={containerRef}
        style={{
          gridTemplateColumns: '',
        }}
      >
        <Grid alignItems="center" autoColumns="min-content" autoFlow="column" height="100%">
          {buttons}
        </Grid>
      </div>

      {menu}
    </>
  );
}
