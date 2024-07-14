import React, { useEffect, useRef } from 'react';
import { useAnimationFrame } from 'framer-motion';

import { formatDurationFromEpoch } from '@utils/string';
import styled from 'styled-components';
import { PaddingVerticalEnum } from '@mana/themes/interactive';
import { baseXs } from '../../styles/typography';

type StyleProps = {
  className?: string;
  inverted?: boolean;
  left?: boolean;
  passthrough?: boolean;
  secondary?: boolean;
  statusVariant?: boolean;
  style?: React.CSSProperties;
  timer?: boolean;
  top?: boolean;
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

const StatusTag = styled.div<StyleProps>`
  align-items: center;
  background-color: var(--colors-green);
  border-radius: 8px;
  color: var(--fonts-color-text-inverted);
  display: inline-flex;
  font-family: var(--fonts-family-base-semibold);
  font-size: var(--fonts-size-xs);
  justify-content: center;
  padding: 6px;

  ${({ left, top }) => (left || top) && `
    position: absolute;
    z-index: 7;
    ${left ? 'left: -12px;' : ''}
    ${top ? 'top: -12px;' : ''}
  `}
`;

function Timer() {
  const timerRef = useRef(null);
  const initTimeRef = useRef<number>(Number(new Date()));

  useAnimationFrame(() => {
    const now = Number(new Date());
    let diff = (now - initTimeRef.current) / 1000;
    if (diff >= 60 * 1000) {
      diff = Math.round(diff);
    }
    if (timerRef?.current) {
      timerRef.current.innerText = formatDurationFromEpoch(diff * 1000);
    }
  });

  return <div ref={timerRef} />;
}

function Tag({
  children,
  statusVariant,
  timer,
  ...props
}: { children?: React.ReactNode | string | number } & StyleProps, ref: React.Ref<HTMLDivElement>) {
  const El = statusVariant ? StatusTag : TagStyled;
  return (
    <El {...props} ref={ref}>
      {timer ? <Timer />  : children}
    </El>
  );
}

export default React.forwardRef(Tag);
