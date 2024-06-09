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
  align-items: center;
  display: grid;
  grid-auto-columns: min-content;
  grid-auto-flow: column;

  ${({ small }) => (small ? buttonsSm : buttons)}
  column-gap: ${({ Icon }) => (Icon ? 8 : 6)}px;
  white-space: nowrap;
`;

const ButtonStyled = styled.button<ButtonStyleProps>`
  ${CSS}
`;

const AStyled = styled.a<ButtonStyleProps>`
  ${CSS}
`;

function Button({ anchor, basic, children, primary, secondary, tag, ...props }: ButtonProps) {
  const HTMLTag = anchor ? AStyled : ButtonStyled;
  const { Icon } = props;

  return (
    // @ts-ignore
    <HTMLTag {...props} basic={basic} primary={primary} secondary={secondary}>
      {Icon && <Icon inverted={primary || secondary} />}
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
