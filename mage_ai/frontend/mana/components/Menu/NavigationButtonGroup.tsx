import DashedDivider from '@mana/elements/Divider/DashedDivider';
import { createPortal } from 'react-dom';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import stylesNavigation from '@styles/scss/components/Menu/NavigationButtonGroup.module.scss';
import useKeyboardShortcuts from '../../hooks/shortcuts/useKeyboardShortcuts';
import { CaretDown } from '@mana/icons';
import { MenuGroupType } from './interfaces';
import { KeyEnum } from '@mana/events/enums';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import { MenuItemType } from '@mana/hooks/useContextMenu';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { hyphensToSnake, snakeToHyphens, parseDynamicUrl } from '@utils/url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMenuManager } from '@mana/components/Menu/MenuManager';
import { useRouter } from 'next/router';

type NavigationButtonGroupProps = {
  groups?: MenuItemType[];
  uuid?: string;
};
export default function NavigationButtonGroup({ groups, uuid }: NavigationButtonGroupProps) {
  const router = useRouter();

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedButtonIndexRef = useRef<number | null>(null);
  const [selectedGroupsByLevel, setSelectedGroupsByLevel] = useState<MenuGroupType[]>(null);

  const contextMenuID = 'NavigationButtonGroup';
  const { handleToggleMenu, portalRef } = useMenuManager({
    contextMenuRef,
    direction: LayoutDirectionEnum.RIGHT,
    onClose: (levelToClose: number) => {
      if (levelToClose === 0) {
        handleToggleMenu({ items: null, openItems: null });
      }
    },
    ref: containerRef,
    uuid: uuid ?? contextMenuID,
  });
  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target: containerRef,
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
            }
            openMenu();
          },
          predicate: {
            key: KeyEnum.ARROWDOWN,
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

  useEffect(() => {
    const handleRouteChangeComplete = (pathname: string) => {
      const { slug } = parseDynamicUrl(pathname, '/v2/pipelines/[uuid]/[...slug]');
      const uuids = (Array.isArray(slug) ? slug : [slug])?.map(
        path => hyphensToSnake(path))?.filter(pk => pk !== PipelineExecutionFrameworkUUIDEnum.RAG);

      const groupsNext = [];
      uuids.forEach((uuid, level: number) => {
        const arr = (level === 0 ? groups[level] : groupsNext[level - 1])?.items;
        if (arr?.length > 0) {
          const group = arr?.find(g => g.uuid === uuid);
          groupsNext.push(group);
        } else {
          groupsNext.push(null);
        }
      });

      const missing = groupsNext.findIndex(g => !(g ?? false));
      if (missing >= 0) {
        groupsNext.splice(missing);
      }

      setSelectedGroupsByLevel(groupsNext);
    };

    if (selectedGroupsByLevel === null) {
      handleRouteChangeComplete(router.asPath);
    }

    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [groups, selectedGroupsByLevel]);

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
          style={{
            color: beforeSelected ? 'var(--backgrounds-button-secondary-default)' : undefined,
          }}
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

      {createPortal(
        <div id={[
          uuid,
          contextMenuID,
          'menu-manager-context-menu',
        ].filter(Boolean).join(':')} ref={contextMenuRef} />,
        portalRef.current,
      )}
    </>
  );
}
