import React from 'react';
import styled, { css } from 'styled-components';

import ButtonGroup from './Group';
import Tag from '../../components/Tag';
import buttons, { StyleProps, sm as buttonsSm } from '../../styles/buttons';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';


type ButtonStyleProps = {
  Icon?: ({ ...props }: any) => any;
  IconAfter?: ({ ...props }: any) => any;
  anchor?: boolean;
  children?: React.ReactNode;
  small?: boolean;
} & StyleProps;

type ButtonProps = {
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  tag?: string;
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
`;

const ButtonStyled = styled.button<ButtonStyleProps>`
  ${CSS}

  display: grid;
`;

const AStyled = styled.a<ButtonStyleProps>`
  ${CSS}

  display: inline-grid;
`;

function Button({
  anchor,
  asLink,
  basic,
  children,
  primary,
  secondary,
  small,
  tag,
  ...props
}: ButtonProps) {
  const HTMLTag = anchor || asLink ? AStyled : ButtonStyled;
  const { Icon, IconAfter } = props;

  return (
    // @ts-ignore
    <HTMLTag
      {...props}
      asLink={asLink}
      basic={basic}
      primary={primary}
      secondary={secondary}
      small={small}
      style={{
        gridTemplateColumns: [
          Icon ? 'auto' : '',
          children ? '1fr' : '',
          tag ? 'auto' : '',
          IconAfter ? 'auto' : '',
        ].join(' '),
      }}
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
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export { ButtonGroup };
export default ButtonWrapper;
