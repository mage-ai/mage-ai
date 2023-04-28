import React, { useState } from 'react';
import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

export const VERTICAL_NAVIGATION_WIDTH = (PADDING_UNITS * UNIT) + (5 * UNIT) + (PADDING_UNITS * UNIT) + 1;

export const ContainerStyle = styled.div`
  display: flex;
  flex-direction: row;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  position: fixed;
  top: ${HEADER_HEIGHT}px;
  width: 100%;

  ${props => `
    background-color: ${(props.theme.background || dark.background).page};
  `}
`;

type VerticalNavigationStyleProps = {
  borderLess?: boolean;
  showMore?: boolean;
};

const VerticalNavigationStyleComponent = styled.div<VerticalNavigationStyleProps>`
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => !props.borderLess && `
    background-color: ${(props.theme.background || dark.background).panel};
    border-right: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  @keyframes animate-in {
    0% {
      width: ${UNIT * 9}px;
    }

    100% {
      width: ${UNIT * 40}px;
    }
  }

  ${props => props.showMore && `
    &:hover {
      animation: animate-in 40ms linear forwards;
      height: 100%;
      position: fixed;
      z-index: 100;
    }
  `}
`;

export function VerticalNavigationStyle({
  borderLess,
  children,
  showMore,
}: {
  children: any;
} & VerticalNavigationStyleProps) {
  const [visible, setVisible] = useState<boolean>(false);

  return (
    <VerticalNavigationStyleComponent
      borderLess={borderLess}
      onMouseEnter={showMore ? () => setVisible(true) : null}
      onMouseLeave={showMore ? () => setVisible(false) : null}
      showMore={showMore}
    >
      {React.cloneElement(children, {
        showMore,
        visible,
      })}
    </VerticalNavigationStyleComponent>
  );
}

export const SubheaderStyle = styled.div`
  width: 100%;
  padding: ${PADDING_UNITS * UNIT}px;
  position: sticky;
  top: 0;
  z-index: 3;

  ${props => `
    background-color: ${(props.theme.background || dark.background).page};
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const ContentStyle = styled.div<{
  heightOffset?: number;
}>`
  ${ScrollbarStyledCss}

  overflow: auto;

  ${props => `
    height: calc(100vh - ${HEADER_HEIGHT + (props.heightOffset || 0)}px);
  `}
`;

export const NavigationItemStyle = styled.div<{
  primary?: boolean;
  selected?: boolean;
}>`
  align-items: center;
  border-radius: ${BORDER_RADIUS}px;
  display: flex;
  height: ${UNIT * 5}px;
  justify-content: center;
  padding: ${UNIT}px;
  width: ${UNIT * 5}px;

  ${props => props.primary && `
    ${transition()}
    background: ${(props.theme || dark).chart.backgroundPrimary};
    border: 1px solid ${(props.theme || dark).feature.active};

    &:hover {
      background-color: ${(props.theme || dark).interactive.linkSecondary};
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    border-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    color: ${(props.theme.monotone || dark.monotone).white};

    &:hover,
    &:focus,
    &:active {
      background-color: ${(props.theme.interactive || dark.interactive).linkPrimaryHover} !important;
      border-color: ${(props.theme.interactive || dark.interactive).linkPrimary} !important;
    }
  `}

  ${props => props.selectedWithGradientIcon && `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;
