import React from 'react';
import styled, { css } from 'styled-components';

import Tag from '../../components/Tag';
import buttons, { StyleProps, sm as buttonsSm } from '../../styles/buttons';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';

type ButtonStyleProps = {
  anchor?: boolean;
  children: React.ReactNode;
  small?: boolean;
} & StyleProps;

type ButtonProps = {
  tag?: string;
} & ButtonStyleProps & WithLoggingProps;

const CSS = css<ButtonStyleProps>`
  align-items: center;
  column-gap: 6px;
  display: grid;
  grid-auto-columns: min-content;
  grid-auto-flow: column;

  ${({ small }) => small ? buttonsSm : buttons}
`;

const ButtonStyled = styled.button<ButtonStyleProps>`
  ${CSS}
`;

const AStyled = styled.a<ButtonStyleProps>`
  ${CSS}
`;

function Button({
  anchor,
  basic,
  children,
  primary,
  secondary,
  tag,
  ...props
}: ButtonProps) {
  const HTMLTag = anchor ? AStyled : ButtonStyled;

  return (
    <HTMLTag {...props} basic={basic} primary={primary} secondary={secondary}>
      {children}
      {tag && <Tag inverted={primary || secondary} passthrough secondary={basic}>{tag}</Tag>}
    </HTMLTag>
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export default ButtonWrapper;
