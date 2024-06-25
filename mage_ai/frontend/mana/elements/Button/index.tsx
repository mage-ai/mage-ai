import React from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

import ButtonGroup from './Group';
import Loading, { LoadingStyleEnum } from '../../components/Loading';
import Tag from '../../components/Tag';
import buttons, { StyleProps, sm as buttonsSm } from '../../styles/buttons';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';
import { ElementRoleEnum } from '../../shared/types';

type ButtonStyleProps = {
  Icon?: ({ ...props }: any) => any;
  IconAfter?: ({ ...props }: any) => any;
  anchor?: boolean;
  children?: React.ReactNode;
  width?: string;
} & StyleProps;

type ButtonProps = {
  asLink?: boolean;
  className?: string;
  id?: string;
  loading?: boolean;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  plain?: boolean;
  motion?: boolean;
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
  anchor,
  asLink,
  basic,
  children,
  loading,
  motion,
  plain,
  primary,
  secondary,
  small,
  tag,
  Icon,
  IconAfter,
  ...props
}: ButtonProps) {
  const HTMLTag = anchor || asLink ? AStyled : ButtonStyled;
  const loadingRight = loading && Icon && !(tag || IconAfter);
  const loadingLeft = !loadingRight && loading && (!Icon || (!tag && !IconAfter));
  const loadingEl = (
    <div style={{ marginLeft: loadingRight ? 4 : 0, marginRight: loadingLeft ? 4 : 0 }}>
      <Loading loadingStyle={LoadingStyleEnum.BLOCKS} vertical />
    </div>
  );

  return (
    // @ts-ignore
    <HTMLTag
      {...props}
      {...(asLink ? { href: '#' } : {})}
      {...(motion ? { whileTap: { scale: 0.97 } } : {})}
      aslink={asLink ? 'true' : undefined}
      basic={basic ? 'true' : undefined}
      loading={loading ? true : undefined}
      plain={plain ? 'true' : undefined}
      primary={primary ? 'true' : undefined}
      role={ElementRoleEnum.BUTTON}
      secondary={secondary ? 'true' : undefined}
      small={small ? 'true' : undefined}
      style={{
        gridTemplateColumns: [
          Icon ? 'auto' : '',
          children ? '1fr' : '',
          tag ? 'auto' : '',
          IconAfter ? 'auto' : '',
        ].join(' '),
      }}
      tag={tag}
    >
      {Icon && !loadingLeft && <Icon inverted={primary || secondary} small={small} />}
      {loadingLeft && loadingEl}

      {children}

      {tag && !loadingRight && (
        <Tag inverted={primary || secondary} passthrough secondary={basic}>
          {tag}
        </Tag>
      )}

      {IconAfter && !loadingRight && <IconAfter inverted={primary || secondary} small={small} />}

      {loadingRight && loadingEl}
    </HTMLTag>
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export { ButtonGroup };
export default ButtonWrapper;
