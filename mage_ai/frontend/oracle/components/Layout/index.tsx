import React from 'react';
import styled, { css } from 'styled-components';

import { BREAKPOINT_X_LARGE } from '@styles/theme';
import { UNIT } from '@oracle/styles/units/spacing';
import light from '@oracle/styles/themes/light';
import Spacing from '@oracle/elements/Spacing';

export type AsideProps = {
  after?: React.ReactNode;
  before?: React.ReactNode;
};

export type LayoutProps = {
  centerAlign?: boolean;
  children: any;
  fluid?: boolean;
  footer?: React.ReactNode;
  header?: any;
  minHeight?: number | string;
};

export type MainContentProps = {
  headerPadding?: boolean;
  centerAlign?: boolean;
  fluid?: boolean;
}
const WrapperStyle = styled.div<LayoutProps>`
  background-color: ${light.monotone.white}
  ${props => props.minHeight && `
    min-height: ${props.minHeight};
  `}

  ${props => !props.minHeight && `
    min-height: 100vh;
  `}
`;

const LayoutContainerStyle = styled.div<LayoutProps>`
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const MainStyle = styled.main`
  flex-grow: 1;
`;

const MainContentStyle = styled.div<MainContentProps>`
  max-width: ${BREAKPOINT_X_LARGE}px;
  position: relative;

  ${props => props.headerPadding && `
    margin-top: ${UNIT * 2}px;
  `}

  ${props => props.centerAlign && `
    margin: 0 auto;
  `}

  ${props => props.fluid && `
    max-width: 100%;
  `}
`;

function Layout({
  after,
  before,
  centerAlign,
  children,
  fluid,
  footer,
  header,
  minHeight,
}: LayoutProps & AsideProps) {
  return (
    <WrapperStyle
      minHeight={minHeight}
    >
      {header}
      <LayoutContainerStyle>
        {before}
        <MainStyle role="main">
          <MainContentStyle
            centerAlign={centerAlign}
            fluid={fluid}
            headerPadding={header && header?.props?.fluid !== false}
          >
            {children}
          </MainContentStyle>
        </MainStyle>
         { after && 
          <Spacing ml={UNIT}>
            {after}
          </Spacing>
         }
      </LayoutContainerStyle>
      {footer}
    </WrapperStyle>
  );
}

export default Layout;
