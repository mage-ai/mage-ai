import React from 'react';
import styled from 'styled-components';

import { BREAKPOINT_X_LARGE } from '@styles/theme';
import { UNIT } from '@oracle/styles/units/spacing';
import light from '@oracle/styles/themes/light';
import Spacing from '@oracle/elements/Spacing';
import Head from '@oracle/elements/Head';

export type AsideProps = {
  after?: React.ReactNode;
  before?: React.ReactNode;
};

export type LayoutProps = {
  centerAlign?: boolean;
  children: any;
  fluid?: boolean;
  footer?: React.ReactNode;
  fullWidth?: boolean;
  header?: any;
  includeMargins?: boolean;
  minHeight?: number | string;
  pageTitle?: string;
};

export type MainContentProps = {
  centerAlign?: boolean;
  fluid?: boolean;
  fullWidth?: boolean;
  headerPadding?: boolean;
};

const WrapperStyle = styled.div<LayoutProps>`
  background-color: ${light.monotone.white};

  ${props => props.includeMargins && `
    margin: ${UNIT * 4}px;
    margin-top: 0;
  `}

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
  position: relative;

  ${props => props.fullWidth && `
    width: 100%;
  `}

  ${props => !props.fullWidth && `
    max-width: ${BREAKPOINT_X_LARGE}px;
  `}

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
  fullWidth,
  header,
  includeMargins,
  minHeight,
  pageTitle,
}: LayoutProps & AsideProps) {
  return (
    <WrapperStyle
      includeMargins={includeMargins}
      minHeight={minHeight}
    >
      <Head title={pageTitle} />
      {header}

      <LayoutContainerStyle>
        {before}
        <MainStyle role="main">
          <MainContentStyle
            centerAlign={centerAlign}
            fluid={fluid}
            fullWidth={fullWidth}
            headerPadding={header && header?.props?.fluid !== false}
          >
            {children}
          </MainContentStyle>
        </MainStyle>
        {after &&
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
