import React from 'react';
import styled, { css } from 'styled-components';
import text from '../../styles/typography';

type TextProps = {
  children: React.ReactNode;
  inline?: boolean;
};

const CSS = css<TextProps>`
  ${text}
`;

const TextStyled = styled.p<TextProps>`
  ${CSS}
`;

const SpanStyled = styled.span<TextProps>`
  ${CSS}
`;

function Text({ children, inline }: TextProps) {
  const HTMLTag = inline ? SpanStyled : TextStyled;

  return (
    <HTMLTag>
      {children}
    </HTMLTag>
  );
}

export default Text;
