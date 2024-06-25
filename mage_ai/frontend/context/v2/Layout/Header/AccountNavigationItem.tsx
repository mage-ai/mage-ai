import AuthToken from '@api/utils/AuthToken';
import Button from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import MageAvatar from '@mana/icons/avatars';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import api from '@api';
import { redirectToUrl } from '@utils/url';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import useKeyboardShortcuts from '@mana/hooks/shortcuts/useKeyboardShortcuts';
import { CaretDown, CaretLeft, DiamondGem, Expired, Settings, Smiley } from '@mana/icons';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import { REQUIRE_USER_AUTHENTICATION, getUser } from '@utils/session';
import { useMenuManager } from '@mana/components/Menu/MenuManager';

export default function AccountNavigationItem({
  router,
  uuid,
}) {
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userFromLocalStorage = getUser();

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

  function logout() {
    AuthToken.logout(() => {
      api.sessions.updateAsyncServer(null, 1)
        .then(() => {
          redirectToUrl('/sign-in');
        })
        .catch(() => {
          redirectToUrl('/');
        });
    });
  }

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
                  Icon: Settings,
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
                {
                  Icon: Smiley,
                  disabled: true,
                  italic: true,
                  uuid: 'Personalize (coming soon)',
                },
                {
                  Icon: DiamondGem,
                  disabled: true,
                  italic: true,
                  uuid: 'Achievements (coming soon)',
                },
                {
                  Icon: Mage8Bit,
                  disabled: true,
                  italic: true,
                  uuid: 'Community (coming soon)',
                },
                ...(REQUIRE_USER_AUTHENTICATION() ? [
                  {
                    Icon: Expired,
                    onClick: (event: any) => {
                      event.preventDefault();
                      event.stopPropagation();
                      logout();
                    },
                    uuid: 'Sign out',
                  }
                ]: []),
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
            columnGap={4}
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
