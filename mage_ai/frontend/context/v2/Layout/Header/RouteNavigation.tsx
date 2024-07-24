import Button from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import NavTag from '@mana/components/Tag/NavTag';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import Text from '@mana/elements/Text';
import useKeyboardShortcuts from '@mana/hooks/shortcuts/useKeyboardShortcuts';
import { CaretDown, CaretLeft } from '@mana/icons';
import { KeyEnum } from '@mana/events/enums';
import { LayoutContext } from '@context/v2/Layout';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import { sortByKey } from '@utils/array';
import { useMenuManager } from '@mana/components/Menu/MenuManager';

function RouteNavigation({
  buttonProps,
  gridProps,
  iconProps,
  navTag,
  routeHistory,
  selectedNavItem,
  title,
  uuid,
}, ref: React.Ref<HTMLDivElement>) {
  const { changeRoute } = useContext(LayoutContext);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target: containerRef,
  });

  const emptyHistory = useMemo(() => (routeHistory?.length ?? 0) === 0, [routeHistory]);

  const contextMenuID = 'RouteNavigation';
  const { handleToggleMenu } = useMenuManager({
    direction: LayoutDirectionEnum.RIGHT,
    onClose: (levelToClose: number) => {
      if (levelToClose === 0) {
        handleToggleMenu({ items: null });
      }
    },
    ref: containerRef,
    uuid: uuid ?? contextMenuID,
  });

  useEffect(() => {
    registerCommands(
      {
        open: {
          handler: (event: any) => {
            if (!emptyHistory) {
              changeRoute(null);
            }
          },
          predicate: {
            altKey: true,
            key: KeyEnum.ARROWLEFT,
          },
        },
      },
      {
        uuid: 'RouteNavigation',
      },
    );

    return () => {
      deregisterCommands();
    };
  }, [deregisterCommands, emptyHistory, routeHistory, registerCommands, handleToggleMenu]);

  return (
    <>
      <div ref={containerRef}>
        <Button
          {...buttonProps}
          motion={false}
          onClick={emptyHistory ? undefined : (event: any) => {
            event.preventDefault();
            event.stopPropagation();
            handleToggleMenu({ items: null });
            changeRoute(null);
          }}
          onMouseEnter={emptyHistory ? undefined : (event: any) => {
            event.preventDefault();
            event.stopPropagation();
            handleToggleMenu({
              items: sortByKey(routeHistory ?? [], rh => rh.timestamp, { ascending: false })?.map(({
                app,
                route,
              }, idx: number) => ({
                Icon: app?.Icon,
                description: route?.href,
                label: app?.name ?? app?.uuid,
                onClick: (event2: any) => {
                  event2.preventDefault();
                  event2.stopPropagation();
                  changeRoute({
                    app,
                    route,
                  }, {
                    transitionOnly: true,
                  });
                  handleToggleMenu({ items: null });
                },
                uuid: [app?.uuid, route?.hreef, String(idx)].filter(Boolean).join(':'),
              })),
            });
          }}
          style={{
            cursor: emptyHistory ? 'default' : 'pointer',
            gridTemplateColumns: '',
          }}
          wrap
        >
          <Grid
            {...gridProps}
            alignItems="center"
            columnGap={12}
            paddingRight={title ?? false ? 8 : undefined}
          >
            {!emptyHistory && <CaretLeft {...iconProps} />}

            {navTag && (
              <NavTag role="tag">
                {!navTag ? <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</> : navTag}
              </NavTag>
            )}

            {title ? (
              <Text nowrap role="title" semibold>
                {title}
              </Text>
            ) : (
              <div style={{ width: 120 }} />
            )}
          </Grid>
        </Button>
      </div>

      <div id={[
        uuid,
        contextMenuID,
        'menu-manager-context-menu',
      ].filter(Boolean).join(':')} ref={contextMenuRef} />
    </>
  );
}

export default React.forwardRef(RouteNavigation);
