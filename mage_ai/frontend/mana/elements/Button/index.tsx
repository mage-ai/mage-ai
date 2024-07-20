import React from 'react';
import NextLink from 'next/link';
import styles from '@styles/scss/elements/Button/Button.module.scss';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

import ButtonGroup from './Group';
import Loading from '../../components/Loading';
import Tag, { TagProps } from '../../components/Tag';
import buttons, { StyleProps, sm as buttonsSm } from '../../styles/buttons';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';

type ButtonStyleProps = {
  Icon?: ({ ...props }: any) => any;
  IconAfter?: ({ ...props }: any) => any;
  anchor?: boolean | string;
  header?: boolean;
  children?: React.ReactNode;
  width?: string;
} & StyleProps;

export type ButtonProps = {
  asLink?: boolean;
  className?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
  id?: string;
  linkProps?: {
    as?: string;
    href: string;
  };
  loading?: boolean;
  loadingColorName?: string;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  plain?: boolean;
  motion?: boolean;
  style?: React.CSSProperties;
  tagProps?: TagProps;
  target?: string;
  href?: string;
} & ButtonStyleProps &
  WithLoggingProps;

const cssRow = css<ButtonStyleProps>`
  align-items: center;
  column-gap: ${({ Icon, theme }) => theme.buttons.grid.column.gap[Icon ? 'base' : 'sm']}px;
  grid-auto-columns: min-content;
  grid-auto-flow: column;
  justify-content: space-between;
  white-space: nowrap;
`;

const CSS = css<ButtonStyleProps>`
  ${({ small }) => (small ? buttonsSm : buttons)}
  ${cssRow}
  ${({ width }) => width && `width: ${width};`}
`;

const ButtonStyled = styled(motion.button)<ButtonStyleProps>`
  ${CSS}

  display: grid;
`;

const AStyled = styled(motion.a)<ButtonStyleProps>`
  ${CSS}

  align-items: center;
  display: inline-grid;

  &:focus {
    outline: none;
  }
`;

function Button({
  Icon,
  IconAfter,
  anchor,
  asLink,
  basic,
  children,
  containerRef,
  href,
  linkProps,
  loading,
  loadingColorName,
  motion,
  plain,
  primary,
  secondary,
  small,
  style,
  tag,
  tagProps,
  target,
  wrap,
  ...props
}: ButtonProps) {
  const islink = anchor || asLink || linkProps;
  const HTMLTag = islink ? AStyled : ButtonStyled;

  const dataProps = {};
  Object.entries(props ?? {})?.forEach(([key, value]) => {
    if (key?.startsWith('data-')) {
      dataProps[key] = value;
      delete props[key];
    }
  });

  const iconProps = {
    inverted: !props?.disabled && (primary || secondary),
    muted: props?.disabled,
    small,
  };

  const el = (
    // @ts-ignore
    <HTMLTag
      {...props}
      {...(asLink || linkProps ? { href: href ?? linkProps?.href ?? '#' } : {})}
      {...(motion ? { whileTap: { scale: 0.97 } } : {})}
      aslink={asLink ? 'true' : undefined}
      basic={basic ? 'true' : undefined}
      loading={loading ? 'true' : undefined}
      plain={plain ? 'true' : undefined}
      primary={primary ? 'true' : undefined}
      secondary={secondary ? 'true' : undefined}
      small={small ? 'true' : undefined}
      style={{
        gridTemplateColumns: [
          Icon ? 'auto' : '',
          children ? '1fr' : '',
          tag ? 'auto' : '',
          IconAfter ? 'auto' : '',
        ].join(' '),
        ...style,
      }}
      tag={tag}
      target={target}
      wrap={wrap ? 'true' : undefined}
      {...(!islink && !wrap
        ? {
            // whileHover: { scale: 1.2 },
            // whileFocus
            whileTap: {
              scale: 0.95,
            },
          }
        : {})}
    >
      {Icon && <Icon {...iconProps} />}

      {children}

      {tag && (
        <Tag inverted={primary || secondary} passthrough secondary={basic} {...tagProps}>
          {tag}
        </Tag>
      )}

      {IconAfter && <IconAfter {...iconProps} />}
    </HTMLTag>
  );

  return (
    <div
      {...dataProps}
      className={[styles.container, loading && styles.loading].filter(Boolean).join(' ')}
      ref={containerRef}
      role="button"
    >
      <div className={[styles.overlay].filter(Boolean).join(' ')} />
      <div className={[styles.loader].filter(Boolean).join(' ')}>
        <Loading circle colorName={loadingColorName === 'blue' ? 'white' : loadingColorName} />
      </div>

      {linkProps?.href && (
        <NextLink as={linkProps.as} href={linkProps.href}>
          {el}
        </NextLink>
      )}

      {!linkProps?.href && el}
    </div>
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export { ButtonGroup };
export default ButtonWrapper;
