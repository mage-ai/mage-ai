import React from 'react';

import styled from 'styled-components';
import { PaddingVerticalEnum } from '@mana/themes/interactive';
import { baseXs } from '../../styles/typography';

type StyleProps = {
  className?: string;
  inverted?: boolean;
  passthrough?: boolean;
  secondary?: boolean;
  statusVariant?: boolean;
  style?: React.CSSProperties;
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

const StatusTag = styled.div`
  align-items: center;
  background-color: var(--colors-green);
  border-radius: 8px;
  color: var(--fonts-color-text-inverted);
  display: inline-flex;
  font-family: var(--fonts-family-base-semibold);
  font-size: var(--fonts-size-xs);
  justify-content: center;
  padding: 6px;
`

function Tag({ children, statusVariant, ...props }: { children: React.ReactNode | string | number } & StyleProps, ref: React.Ref<HTMLDivElement>) {
  const El = statusVariant ? StatusTag : TagStyled;
  return <El {...props} ref={ref}>{children}</El>;
}

export default React.forwardRef(Tag);
