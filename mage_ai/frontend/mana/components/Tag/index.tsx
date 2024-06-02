import React from 'react';
import styled from 'styled-components';
import { baseSm } from '../../styles/typography';

type StyleProps = {
  inverted?: boolean;
  passthrough?: boolean;
  secondary?: boolean;
};

const TagStyled = styled.div<StyleProps>`
  ${baseSm}

  background-color: ${({ inverted, secondary, theme }) =>
    inverted
      ? theme.colors.whiteLo
      : secondary
        ? theme.backgrounds.button.base.default
        : theme.colors.whiteHi};
  border-radius: ${({ theme }) => theme.borders.radius.round};
  color: ${({ inverted, theme }) =>
    inverted ? theme.fonts.color.text.inverted : theme.fonts.color.text.base};
  cursor: inherit;
  display: inline-block;
  font-family: ${({ theme }) => theme.fonts.family.base.semiBold};
  padding: 4px 6px;
  pointer-events: ${({ passthrough }) => (passthrough ? 'inherit' : 'auto')};
`;

function Tag({ children, ...props }: { children: React.ReactNode } & StyleProps) {
  return <TagStyled {...props}>{children}</TagStyled>;
}

export default Tag;
