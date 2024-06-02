import React from 'react';
import styled, { css } from 'styled-components';
import text, { StyleProps } from '../../styles/typography';

type TextProps = {
  children: React.ReactNode;
  inline?: boolean;
} & StyleProps;

const CSS = css<TextProps>`
  ${text}

  margin: 0;
`;

const TextStyled = styled.p<TextProps>`
  ${CSS}
`;

const SpanStyled = styled.span<TextProps>`
  ${CSS}
`;

function Text({ children, inline, ...props }: TextProps) {
  const HTMLTag = inline ? SpanStyled : TextStyled;

  return (
    <HTMLTag {...props}>
      {children}
    </HTMLTag>
  );
}

export default Text;
