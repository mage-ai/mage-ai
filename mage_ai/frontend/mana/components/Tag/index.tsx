import React from 'react';

import styled from 'styled-components';
import { PaddingVerticalEnum } from '@mana/themes/interactive';
import { baseXs } from '../../styles/typography';

type StyleProps = {
  inverted?: boolean;
  passthrough?: boolean;
  secondary?: boolean;
};

const TagStyled = styled.div<StyleProps>`
  ${baseXs}

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
  padding: 4px ${PaddingVerticalEnum.XS};
  pointer-events: ${({ passthrough }) => (passthrough ? 'inherit' : 'auto')};
`;

function Tag({ children, ...props }: { children: React.ReactNode | string | number } & StyleProps) {
  return <TagStyled {...props}>{children}</TagStyled>;
}

export default Tag;
