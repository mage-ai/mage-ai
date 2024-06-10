import React from 'react';
import styled, { css } from 'styled-components';
import text, { StyleProps, baseSm, baseXs } from '../../styles/typography';

type TextProps = {
  children: React.ReactNode;
  inline?: boolean;
  small?: boolean;
  xsmall?: boolean;
} & StyleProps;

const CSS = css<TextProps>`
  ${({ small, xsmall }) => (small ? baseSm : xsmall ? baseXs : text)}

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

  return <HTMLTag {...props}>{children}</HTMLTag>;
}

export default Text;
