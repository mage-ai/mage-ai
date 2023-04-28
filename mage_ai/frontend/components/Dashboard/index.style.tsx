import React, { useState } from 'react';
import styled from 'styled-components';

import Spacing from '@oracle/elements/Spacing';
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
  aligned?: 'left' | 'right';
  borderLess?: boolean;
  showMore?: boolean;
};

const VerticalNavigationStyleComponent = styled.div<VerticalNavigationStyleProps>`
  height: calc(100% - ${HEADER_HEIGHT}px);

  ${props => !props.borderLess && `
    background-color: ${(props.theme.background || dark.background).panel};
  `}

  ${props => !props.borderLess && props.aligned !== 'right' && `
    border-right: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => !props.borderLess && props.aligned === 'right' && `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  @keyframes animate-in {
    0% {
      width: ${UNIT * 21}px;
    }

    100% {
      width: ${UNIT * 34}px;
    }
  }

  ${props => props.showMore && `
    &:hover {
      animation: animate-in 100ms linear forwards;
      position: fixed;
      z-index: 100;
    }
  `}

  ${props => props.showMore && props.aligned === 'right' && `
    &:hover {
      right: 0;
      top: ${HEADER_HEIGHT}px;
    }
  `}
`;

export function VerticalNavigationStyle({
  aligned,
  borderLess,
  children,
  showMore,
}: {
  children: any;
} & VerticalNavigationStyleProps) {
  const [visible, setVisible] = useState<boolean>(false);

  return (
    <VerticalNavigationStyleComponent
      aligned={aligned}
      borderLess={borderLess && !visible}
      onMouseEnter={showMore ? () => setVisible(true) : null}
      onMouseLeave={showMore ? () => setVisible(false) : null}
      showMore={showMore}
    >
      <Spacing
        px={showMore && visible ? 0 : PADDING_UNITS}
        py={showMore && visible ? 1 : PADDING_UNITS}
      >
        {React.cloneElement(children, {
          showMore,
          visible,
        })}
      </Spacing>
    </VerticalNavigationStyleComponent>
  );
}

export const SubheaderStyle = styled.div`
  padding: ${PADDING_UNITS * UNIT}px;
  position: sticky;
  top: 0;
  width: 100%;
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
  showMore?: boolean;
  withGradient?: boolean;
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

  ${props => props.selected && !props.withGradient && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}

  ${props => props.selected && props.withGradient && `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => !props.selected && props.showMore &&`
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}
`;

export const NavigationLinkStyle = styled.a<{
  selected?: boolean;
}>`
  ${transition()}

  display: block;
  padding: ${UNIT * 1}px ${UNIT * PADDING_UNITS}px;

  ${props => !props.selected && `
    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimaryHover};
  `}
`;
