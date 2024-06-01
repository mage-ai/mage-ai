import React from 'react';
import styled, { css } from 'styled-components';
import buttons from '../../styles/buttons';
import Tag from '../../components/Tag';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';

type ButtonStyleProps = {
  anchor?: boolean;
  children: React.ReactNode;
};

type ButtonProps = {
  tag?: string;
} & ButtonStyleProps & WithLoggingProps;

const CSS = css<ButtonStyleProps>`
  ${buttons}

  column-gap: 6px;
  display: grid;
  grid-auto-columns: min-content;
  grid-auto-flow: column;
`;

const ButtonStyled = styled.button<ButtonStyleProps>`
  ${CSS}
`;

const AStyled = styled.a<ButtonStyleProps>`
  ${CSS}
`;

function Button({
  anchor,
  children,
  onClick,
  tag,
}: ButtonProps) {
  const HTMLTag = anchor ? AStyled : ButtonStyled;

  return (
    <HTMLTag onClick={onClick}>
      <div>
        {children}
      </div>
      {tag && <Tag>{tag}</Tag>}
    </HTMLTag>
  );
}

export default useWithLogging(Button);
