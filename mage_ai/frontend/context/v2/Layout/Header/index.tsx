import AccountNavigationItem from './AccountNavigationItem';
import Button from '@mana/elements/Button';
import DashedDivider from '@mana/elements/Divider/DashedDivider';
import Grid from '@mana/components/Grid';
import NavigationButtonGroup from '@mana/components/Menu/NavigationButtonGroup';
import React, { useMemo, useRef } from 'react';
import RouteNavigation from './RouteNavigation';
import SearchApplication from './SearchApplication';
import Scrollbar from '@mana/elements/Scrollbar';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { HeaderProps } from './interfaces';
import { MenuItemType } from '@mana/hooks/useContextMenu';
import { ModeEnum } from '@mana/themes/modes';
import { ChatV2, Code, DocumentIcon, Dark } from '@mana/icons';
import { unique } from '@utils/array';

export const HEADER_ROOT_ID = 'v2-header-root';

export function Header(
  {
    buildInterAppNavItems,
    buildIntraAppNavItems,
    cacheKey,
    globalNavItems,
    interAppNavItems,
    intraAppNavItems,
    navTag,
    routeHistory,
    router,
    searchApp,
    selectedNavItem,
    title,
    uuid,
    updateThemeSettings,
    version,
  }: HeaderProps,
  ref: React.MutableRefObject<HTMLDivElement | null>,
) {
  const headerRef = useRef<HTMLDivElement | null>(ref?.current);

  const buttonProps = useMemo(
    () => ({
      className: [stylesHeader.button].join(' '),
      // motion: true,
      small: true,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [],
  );

  const gridProps = useMemo(
    () => ({
      autoColumns: 'min-content',
      autoFlow: 'column',
      columnGap: 10,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [],
  );

  const iconProps = useMemo(
    () => ({
      className: stylesHeader.buttonIcon,
      size: 16,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [],
  );

  const interAppItems = useMemo(() => {
    const itemsDefault = [
      {
        Icon: Code,
        onClick: () => {
          router.push('/v2/apps/editor');
        },
        uuid: 'code',
      },
    ];
    const items: (MenuItemType & {
      placeholder?: boolean;
    })[] = [...(interAppNavItems ?? [])];

    if (!version && !items?.length) {
      items.push({
        placeholder: true,
        uuid: 'placeholder-inter-app-item-0',
      });
    }

    return buildInterAppNavItems
      ? buildInterAppNavItems?.(interAppNavItems ?? itemsDefault, { router })
      : items.concat(itemsDefault);
  }, [version, router, interAppNavItems, buildInterAppNavItems]);

  const globalItems = globalNavItems ?? [
    {
      Icon: Dark,
      onClick: () => {
        updateThemeSettings(({ mode }) => ({
          mode: ModeEnum.LIGHT === mode ? ModeEnum.DARK : ModeEnum.LIGHT,
        }));
      },
      style: {
        gridTemplateColumns: '',
      },
      uuid: 'Change theme mode',
    },
    {
      Icon: ChatV2,
      linkProps: { href: 'https://www.mage.ai/chat' },
      style: {
        gridTemplateColumns: '',
      },
      target: '_blank',
      uuid: 'help',
    },
    {
      Icon: DocumentIcon,
      linkProps: { href: 'https://docs.mage.ai' },
      style: {
        gridTemplateColumns: '',
      },
      target: '_blank',
      uuid: 'docs',
    },
  ];

  const renderNavItems = (
    items: (MenuItemType & {
      placeholder?: boolean;
    })[],
  ) =>
    unique(items, ({ uuid }) => uuid)?.map(({ Icon, label, placeholder, uuid, ...rest }) => (
      <nav key={uuid}>
        <Button
          {...buttonProps}
          {...rest}
          Icon={ip => (Icon ? <Icon {...ip} {...iconProps} /> : null)}
          className={[
            ...(buttonProps?.className?.split(' ') ?? []),
            selectedNavItem === uuid ? stylesHeader.selected : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-uuid={uuid}
          style={{
            gridTemplateColumns: '',
          }}
        >
          {placeholder && <div style={{ width: iconProps?.size }} />}
          {label && label?.()}
        </Button>
      </nav>
    ));

  const intraAppItemsMemo = useMemo(() => {
    const hasItems = intraAppNavItems?.length >= 1 || buildIntraAppNavItems;

    if (version && !hasItems) {
      return null;
    }

    return (
      <Grid {...gridProps}>
        {!version && !hasItems && (
          <Button
            {...buttonProps}
            style={{
              gridTemplateColumns: '',
            }}
          >
            <div style={{ width: 200 }} />
          </Button>
        )}

        {hasItems && (
          <NavigationButtonGroup
            groups={intraAppNavItems}
            uuid={uuid}
          />
        )}
      </Grid>
    );
  }, [buttonProps, cacheKey, intraAppNavItems, buildIntraAppNavItems, gridProps, uuid, version]);

  return (
    <>
      <header className={stylesHeader.header} ref={headerRef}>
        <Grid
          {...gridProps}
          paddingLeft={10}
          paddingRight={10}
          style={{
            gridTemplateColumns: [
              'min-content',
              interAppItems && 'min-content',
              'minmax(0, 1fr)',
              'min-content',
            ]
              .filter(Boolean)
              .join(' '),
          }}
        >
          <Grid {...gridProps} paddingBottom={6} paddingTop={6}>
            <RouteNavigation
              buttonProps={buttonProps}
              gridProps={gridProps}
              iconProps={iconProps}
              navTag={navTag}
              routeHistory={routeHistory}
              selectedNavItem={selectedNavItem}
              title={title}
              uuid={uuid}
            />

            <DashedDivider vertical />
          </Grid>

          {interAppItems?.length && (
            <Grid {...gridProps} paddingBottom={6} paddingTop={6}>
              {renderNavItems(interAppItems)}
            </Grid>
          )}

          <Scrollbar hideXscrollbar>
            <Grid
              {...gridProps}
              paddingBottom={6}
              paddingTop={6}
              style={{
                gridTemplateColumns: 'min-content min-content 1fr min-content',
              }}
            >
              <DashedDivider vertical />

              {intraAppItemsMemo}

              <SearchApplication enabled={(searchApp ?? false) ? true : false} {...(searchApp ?? {})} />

              {searchApp && <DashedDivider vertical />}
            </Grid>
          </Scrollbar>

          <Grid {...gridProps} paddingBottom={6} paddingTop={6}>
            {renderNavItems(globalItems)}

            <AccountNavigationItem router={router} uuid={uuid} />
          </Grid>
        </Grid>

        <DashedDivider />
      </header>
    </>
  );
}

export default React.forwardRef(Header);
