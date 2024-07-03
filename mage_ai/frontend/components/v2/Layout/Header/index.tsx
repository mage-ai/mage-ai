import React from 'react';
import Grid from '@mana/components/Grid';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { Code, Builder, CaretLeft } from '@mana/icons';
import Button from '@mana/elements/Button';
import Text from '@mana/elements/Text';
import NavTag from '@mana/components/Tag/NavTag';

export const HEADER_ROOT_ID = 'v2-header-root';

export type HeaderProps = {
  navTag?: string;
  selectedNavItem?: string;
  title?: string;
};

export function Header({
  navTag,
  selectedNavItem,
  title,
}: HeaderProps, ref: React.Ref<HTMLDivElement>) {
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

  return (
    <header
      className={stylesHeader.header}
      ref={ref}
    >
      <Grid
        {...gridProps}
        templateColumns="auto auto 1fr auto"
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
          {[
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
          ].map(({
            Icon,
            uuid,
            ...rest
          }) => (
            <nav key={uuid}>
              <Button
                {...buttonProps}
                {...rest}
                Icon={ip => <Icon {...ip} {...iconProps} />}
                className={[
                  ...(buttonProps?.className?.split(' ') ?? []),
                  selectedNavItem === uuid ? stylesHeader.selected : '',
                ].filter(Boolean).join(' ')}
                data-uuid={uuid}
              />
            </nav>
          ))}
        </Grid >
        <Grid {...gridProps}>
        </Grid >
        <Grid {...gridProps}>
        </Grid >
      </Grid >
    </header >
  );
}

export default React.forwardRef(Header);
