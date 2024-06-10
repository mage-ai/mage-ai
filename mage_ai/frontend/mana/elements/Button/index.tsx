import React from 'react';
import styled, { css } from 'styled-components';

import ButtonGroup from './Group';
import Tag from '../../components/Tag';
import buttons, { StyleProps, sm as buttonsSm } from '../../styles/buttons';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';

type ButtonStyleProps = {
  Icon?: ({ ...props }: any) => any;
  anchor?: boolean;
  children?: React.ReactNode;
  small?: boolean;
} & StyleProps;

type ButtonProps = {
  tag?: string;
} & ButtonStyleProps &
  WithLoggingProps;

const CSS = css<ButtonStyleProps>`
  ${({ small }) => (small ? buttonsSm : buttons)}
`;

const ButtonStyled = styled.button<ButtonStyleProps>`
  ${CSS}

  align-items: center;
  display: grid;
  grid-auto-columns: min-content;
  grid-auto-flow: column;
  column-gap: ${({ Icon }) => (Icon ? 8 : 6)}px;
  white-space: nowrap;
`;

const AStyled = styled.a<ButtonStyleProps>`
  ${CSS}

  display: inline-flex;
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
  const { Icon } = props;

  return (
    // @ts-ignore
    <HTMLTag
      {...props}
      asLink={asLink}
      basic={basic}
      primary={primary}
      secondary={secondary}
      small={small}
    >
      {Icon && <Icon inverted={primary || secondary} small={small} />}
      {children}
      {tag && (
        <Tag inverted={primary || secondary} passthrough secondary={basic}>
          {tag}
        </Tag>
      )}
    </HTMLTag>
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export { ButtonGroup };
export default ButtonWrapper;
