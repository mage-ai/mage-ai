import Button from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import MageAvatar from '@mana/icons/avatars';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import useKeyboardShortcuts from '@mana/hooks/shortcuts/useKeyboardShortcuts';
import { CaretDown, CaretLeft } from '@mana/icons';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import { getUser } from '@utils/session';
import { useMenuManager } from '@mana/components/Menu/MenuManager';

export default function AccountNavigationItem({
  router,
  uuid,
}) {
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const contextMenuID = 'AccountNavigationItem';
  const { handleToggleMenu } = useMenuManager({
    direction: LayoutDirectionEnum.LEFT,
    onClose: (levelToClose: number) => {
      if (levelToClose === 0) {
        handleToggleMenu({ items: null });
      }
    },
    ref: containerRef,
    uuid: uuid ?? contextMenuID,
  });

  return (
    <>
      <div ref={containerRef}>
        <Button
          className={[stylesHeader.button].join(' ')}
          motion={false}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            handleToggleMenu({
              items: [
                {
                  linkProps: {
                    href: '/settings/workspace/preferences',
                  },
                  onClick: (event: any) => {
                    event.preventDefault();
                    event.stopPropagation();
                    router.push('/settings/workspace/preferences');
                  },
                  uuid: 'Account settings',
                },
              ],
            });
          }}
          small
          style={{
            gridTemplateColumns: '',
          }}
        >
          <Grid
            alignItems="center"
            autoColumns="min-content"
            autoFlow="column"
            columnGap={10}
          >
            <MageAvatar size={30} variant="a" />

            <CaretDown
              className={stylesHeader.buttonIcon}
              size={16}
            />
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
