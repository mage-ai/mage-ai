import React, { useEffect, useRef } from 'react';

import Timer from '../Timer';
import styled from 'styled-components';
import { PaddingVerticalEnum } from '@mana/themes/interactive';
import { baseXs } from '../../styles/typography';

export type TagProps = {
  backgroundColor?: string;
  bottom?: boolean;
  className?: string;
  inverted?: boolean;
  left?: boolean;
  passthrough?: boolean;
  right?: boolean;
  secondary?: boolean;
  statusVariant?: boolean;
  style?: React.CSSProperties;
  timer?: boolean;
  top?: boolean;
};

const TagStyled = styled.div<TagProps>`
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
  padding: 4px ${PaddingVerticalEnum.XS}px;
  pointer-events: ${({ passthrough }) => (passthrough ? 'inherit' : 'auto')};
`;

const StatusTag = styled.div<TagProps>`
  align-items: center;
  background-color: var(--colors-green);
  border-radius: 8px;
  color: var(--fonts-color-text-inverted);
  display: inline-flex;
  font-family: var(--fonts-family-base-semibold);
  font-size: var(--fonts-size-xs);
  justify-content: center;
  padding: 6px;

  ${({ bottom, left, right, top }) =>
    (bottom || left || right || top) &&
    `
    position: absolute;
    z-index: 7;
    ${bottom ? 'bottom: 0;' : ''}
    ${left ? 'left: 0;' : ''}
    ${right ? 'right: 0;' : ''}
    ${top ? 'top: 0;' : ''}
    transform: translate(${left ? '-70%' : right ? '70%' : '0px'}, ${top ? '-70%' : bottom ? '70%' : '0px'});
  `}
`;

function Tag(
  {
    children,
    statusVariant,
    timer,
    ...props
  }: { children?: React.ReactNode | string | number } & TagProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const El = statusVariant ? StatusTag : TagStyled;
  return (
    <El {...props} ref={ref}>
      {timer ? <Timer /> : children}
    </El>
  );
}

export default React.forwardRef(Tag);
