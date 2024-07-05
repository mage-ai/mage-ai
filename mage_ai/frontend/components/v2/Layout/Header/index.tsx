import Button, { ButtonProps } from '@mana/elements/Button';
import DashedDivider from '@mana/elements/Divider/DashedDivider';
import Grid from '@mana/components/Grid';
import MageAvatar from '@mana/icons/avatars';
import MenuManager from '@mana/components/Menu/MenuManager';
import NavigationButtonGroup from '@mana/components/Menu/NavigationButtonGroup';
import NavTag from '@mana/components/Tag/NavTag';
import React, { createRef, useCallback, useMemo, useRef } from 'react';
import Text from '@mana/elements/Text';
import TextInput from '@mana/elements/Input/TextInput';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import useContextMenu from '@mana/hooks/useContextMenu';
import { Code, Builder, CaretDown, CaretLeft } from '@mana/icons';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import { MenuItemType } from '@mana/hooks/useContextMenu';
import { getUser } from '@utils/session';

export const HEADER_ROOT_ID = 'v2-header-root';

export type HeaderProps = {
  globalNavItems?: MenuItemType[];
  interAppNavItems?: MenuItemType[];
  intraAppNavItems?: MenuItemType[];
  navTag?: string;
  router?: any;
  selectedNavItem?: string;
  title?: string;
};

export function Header({
  globalNavItems,
  interAppNavItems,
  intraAppNavItems,
  navTag,
  router,
  selectedNavItem,
  title,
}: HeaderProps, ref: React.MutableRefObject<HTMLDivElement | null>) {
  console.log('Header render');
  let headerRef = ref;
  headerRef ||= useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, React.MutableRefObject<HTMLElement>>>({});

  const {
    contextMenu,
    renderContextMenu,
    removeContextMenu,
  } = useContextMenu({
    containerRef: headerRef,
    useAsStandardMenu: true,
    uuid: 'main-header',
  });

  const buttonProps = useMemo(() => ({
    className: [
      stylesHeader.button,
    ].join(' '),
    // motion: true,
    small: true,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const gridProps = {
    autoColumns: 'min-content',
    autoFlow: 'column',
    columnGap: 10,
  };
  const iconProps = useMemo(() => ({
    className: stylesHeader.buttonIcon,
    size: 16,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const interAppItems = interAppNavItems ?? [
    {
      Icon: Builder,
      // linkProps: {
      //   as: '/v2/pipelines/[slug]/builder/[subslug]', // Dynamic route template
      //   href: '/v2/pipelines/rag1/builder/rag', // Actual path with replaced segments
      // },
      onClick: () => {
        router.push({
          pathname: '/v2/pipelines/[slug]/builder/[framework]',
          query: {
            framework: 'rag',
            slug: 'rag1',
          },
        });
      },
      uuid: 'builder',
    },
    {
      Icon: Code,
      // linkProps: {
      //   href: '/v2/test',
      // },
      onClick: () => {
        router.push('/v2/test');
      },
      uuid: 'code',
    },
  ];

  const globalItems = globalNavItems ?? [
    {
      label: () => 'Help',
      linkProps: { href: 'https://www.mage.ai/chat' },
      style: {
        gridTemplateColumns: '',
      },
      target: '_blank',
      uuid: 'help',
    },
    {
      label: () => 'Docs',
      linkProps: { href: 'https://docs.mage.ai' },
      style: {
        gridTemplateColumns: '',
      },
      target: '_blank',
      uuid: 'docs',
    },
  ];

  const renderNavItems = (items: MenuItemType[]) => items.map(({
    Icon,
    label,
    uuid,
    ...rest
  }) => (
    <nav key={uuid}>
      <Button
        {...buttonProps}
        {...rest}
        Icon={ip => Icon ? <Icon {...ip} {...iconProps} /> : null}
        className={[
          ...(buttonProps?.className?.split(' ') ?? []),
          selectedNavItem === uuid ? stylesHeader.selected : '',
        ].filter(Boolean).join(' ')}
        data-uuid={uuid}
        style={{
          gridTemplateColumns: '',
        }}
      >
        {label && label?.()}
      </Button>
    </nav>
  ));

  const intraItems = useMemo(() => intraAppNavItems?.map(({
    Icon,
    items,
    label,
    uuid,
  }: MenuItemType, index: number) => (
    <MenuManager
      direction={LayoutDirectionEnum.RIGHT}
      items={items}
      key={uuid}
      uuid={uuid}
    >
      <Button
        {...buttonProps}
        Icon={ip => Icon ? <Icon {...ip} {...iconProps} /> : null}
        IconAfter={ip => <CaretDown {...ip} {...iconProps} />}
        style={{
          gridTemplateColumns: '',
        }}
      >
        {(label && label?.()) ?? uuid}
      </Button>
    </MenuManager>
  )), [buttonProps, intraAppNavItems, iconProps]);

  console.log(intraAppNavItems)

  return (
    <>
      <header
        className={stylesHeader.header}
        ref={headerRef}
      >
        <Grid
          {...gridProps}
          paddingBottom={6}
          paddingLeft={10}
          paddingRight={10}
          paddingTop={6}
          style={{
            gridTemplateColumns: 'auto auto auto 1fr auto',
          }}
        >
          <Grid
            {...gridProps}
          >
            <Button
              {...buttonProps}
              style={{
                gridTemplateColumns: '',
              }}
            >
              <Grid
                {...gridProps}
                alignItems="center"
                columnGap={12}
                paddingRight={(title ?? false) ? 8 : undefined}
              >
                <CaretLeft {...iconProps} />

                {navTag && <NavTag role="tag">{navTag}</NavTag >}
                {title && <Text nowrap role="title" semibold>{title}</Text  >}
              </Grid>
            </Button >
          </Grid >

          <Grid {...gridProps}>
            {renderNavItems(interAppItems)}
          </Grid>

          <Grid {...gridProps}>
            <DashedDivider vertical />
            {intraAppNavItems?.length >= 1 && (
              <NavigationButtonGroup
                groups={intraAppNavItems}
              />
            )}
          </Grid>

          <Grid {...gridProps} templateColumns="1fr">
            <TextInput basic monospace placeholder="Data Command Center" small />
          </Grid>

          <Grid {...gridProps}>
            {renderNavItems(globalItems)}

            <Button
              {...buttonProps}
              style={{
                gridTemplateColumns: '',
              }}
            >
              <Grid
                {...gridProps}
                alignItems="center"
                columnGap={10}
              >
                <MageAvatar size={24} variant="a" />

                Sorceress

                <CaretDown {...iconProps} />
              </Grid>
            </Button >
          </Grid>
        </Grid >

        <DashedDivider />
      </header >
      {contextMenu}
    </>
  );
}

export default React.forwardRef(Header);
