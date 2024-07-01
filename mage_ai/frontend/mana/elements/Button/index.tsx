import React from 'react';
import styles from '@styles/scss/elements/Button/Button.module.scss';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

import ButtonGroup from './Group';
import Loading from '../../components/Loading';
import Tag from '../../components/Tag';
import buttons, { StyleProps, sm as buttonsSm } from '../../styles/buttons';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';
import { ElementRoleEnum } from '../../shared/types';

type ButtonStyleProps = {
  Icon?: ({ ...props }: any) => any;
  IconAfter?: ({ ...props }: any) => any;
  anchor?: boolean | string;
  children?: React.ReactNode;
  width?: string;
} & StyleProps;

type ButtonProps = {
  asLink?: boolean;
  className?: string;
  id?: string;
  loading?: boolean;
  loadingColorName?: string;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  plain?: boolean;
  motion?: boolean;
  style?: React.CSSProperties;
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

const ButtonStyled = styled(motion.button) <ButtonStyleProps>`
  ${CSS}

  display: grid;
`;

const AStyled = styled(motion.a) <ButtonStyleProps>`
  ${CSS}

  align-items: center;
  display: inline-grid;

  &:focus {
    outline: none;
  }
`;

function Button({
  anchor,
  asLink,
  basic,
  children,
  href,
  target,
  loading,
  loadingColorName,
  motion,
  plain,
  primary,
  secondary,
  small,
  style,
  tag,
  wrap,
  Icon,
  IconAfter,
  ...props
}: ButtonProps) {
  const HTMLTag = anchor || asLink ? AStyled : ButtonStyled;

  const dataProps = {};
  Object.entries(props ?? {})?.forEach(([key, value]) => {
    if (key?.startsWith('data-')) {
      dataProps[key] = value;
      delete props[key];
    }
  });

  return (
    <div
      {...dataProps}
      className={[
        styles.container,
        loading && styles.loading,
      ].filter(Boolean).join(' ')}
      role={ElementRoleEnum.BUTTON}
    >
      <div className={[styles.overlay].filter(Boolean).join(' ')} />
      <div className={[styles.loader].filter(Boolean).join(' ')}>
        <Loading circle colorName={loadingColorName} />
      </div>

      {/* @ts-ignore */}
      <HTMLTag
        {...props}
        {...(asLink ? { href: href ?? '#' } : {})}
        {...(motion ? { whileTap: { scale: 0.97 } } : {})}
        aslink={asLink ? 'true' : undefined}
        basic={basic ? 'true' : undefined}
        loading={loading ? true : undefined}
        plain={plain ? 'true' : undefined}
        primary={primary ? 'true' : undefined}
        secondary={secondary ? 'true' : undefined}
        small={small ? 'true' : undefined}
        style={{
          ...style,
          gridTemplateColumns: [
            Icon ? 'auto' : '',
            children ? '1fr' : '',
            tag ? 'auto' : '',
            IconAfter ? 'auto' : '',
          ].join(' '),
        }}
        tag={tag}
        target={target}
        wrap={wrap ? 'true' : undefined}
      >
        {Icon && <Icon inverted={primary || secondary} small={small} />}

        {children}

        {tag && (
          <Tag inverted={primary || secondary} passthrough secondary={basic}>
            {tag}
          </Tag>
        )}

        {IconAfter && <IconAfter inverted={primary || secondary} small={small} />}
      </HTMLTag>
    </div >
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export { ButtonGroup };
export default ButtonWrapper;
