import React from 'react';
import styled, { css } from 'styled-components';
import buttons from '../../styles/buttons';

type ButtonProps = {
  anchor?: boolean;
  children: React.ReactNode;
};

const CSS = css<ButtonProps>`
  ${buttons}
`;

const ButtonStyled = styled.button<ButtonProps>`
  ${CSS}
`;

const AStyled = styled.a<ButtonProps>`
  ${CSS}
`;

function Button({
  anchor,
  children,
}: ButtonProps) {
  const HTMLTag = anchor ? AStyled : ButtonStyled;

  return (
    <HTMLTag>
      {children}
    </HTMLTag>
  );
}

export default Button;
