import React, { useMemo } from 'react';
import Grid from '@mana/components/Grid';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { Code, Builder, CaretDown, CaretLeft } from '@mana/icons';
import MageAvatar from '@mana/icons/avatars';
import Button, { ButtonProps } from '@mana/elements/Button';
import Text from '@mana/elements/Text';
import NavTag from '@mana/components/Tag/NavTag';
import { getUser } from '@utils/session';
import DashedDivider from '@mana/elements/Divider/DashedDivider';

export const HEADER_ROOT_ID = 'v2-header-root';

type NavItemType = {
  label?: () => string;
  uuid: string;
} & ButtonProps;

export type HeaderProps = {
  globalNavItems?: NavItemType[];
  interAppNavItems?: NavItemType[];
  intraAppNavItems?: NavItemType[];
  navTag?: string;
  selectedNavItem?: string;
  title?: string;
};

export function Header({
  globalNavItems,
  interAppNavItems,
  intraAppNavItems,
  navTag,
  selectedNavItem,
  title,
}: HeaderProps, ref: React.Ref<HTMLDivElement>) {
  const userFromLocalStorage = getUser();

  const buttonProps = {
    asLink: true,
    className: [
      stylesHeader.button,
    ].join(' '),
    motion: true,
  };
  const gridProps = {
    autoColumns: 'min-content',
    autoFlow: 'column',
    columnGap: 10,
  };
  const iconProps = {
    className: stylesHeader.buttonIcon,
    size: 16,
  };

  const interAppItems = interAppNavItems ?? [
    {
      Icon: Builder,
      linkProps: {
        href: '/v2/pipelines/rag1/builder/rag',
      },
      uuid: 'builder',
    },
    {
      Icon: Code,
      href: '/v2',
      uuid: 'code',
    },
  ];

  const intraAppItems = intraAppNavItems ?? [
    {
      label: () => 'Tree',
      uuid: 'tree',
    },
    {
      label: () => 'Pipelines',
      uuid: 'pipelines',
    },
    {
      label: () => 'My pipeline',
      uuid: 'current',
    },
  ];

  const globalItems = globalNavItems ?? [
    {
      href: 'https://www.mage.ai/help',
      label: () => 'Help',
      style: {
        gridTemplateColumns: '',
      },
      target: '_blank',
      uuid: 'help',
    },
  ];

  const renderNavItems = (items: NavItemType[]) => items.map(({
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
        {label && <Text secondary semibold small>{label?.()}</Text>}
      </Button>
    </nav>
  ));

  return (
    <header
      className={stylesHeader.header}
      ref={ref}
    >
      <Grid
        {...gridProps}
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
              {title && <Text role="title" semibold>{title}</Text>}
            </Grid>
          </Button >
        </Grid >

        <Grid {...gridProps}>
          {renderNavItems(interAppItems)}
        </Grid>

        <Grid {...gridProps}>
          <DashedDivider vertical />
          {renderNavItems(intraAppItems)}
        </Grid>

        <Grid {...gridProps} />

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
    </header >
  );
}

export default React.forwardRef(Header);
