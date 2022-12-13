import styled, { css } from 'styled-components';

import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { UNIT } from '@oracle/styles/units/spacing';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';

const HEADER_PADDING_Y_UNITS = 1.5;
const PADDING_UNITS = 1.75;

const HEADER_STYLES = css`
  padding: ${PADDING_UNITS * UNIT}px;
  padding-bottom: ${HEADER_PADDING_Y_UNITS * UNIT}px;
  padding-top: ${HEADER_PADDING_Y_UNITS * UNIT}px;
`;

const PanelStyle = styled.div<any>`
  border-radius: ${BORDER_RADIUS}px;
  overflow: hidden;
  width: 100%;
  
  ${props => `
    background-color: ${(props.theme.background || light.background).panel};
    border: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}

  ${props => !props.fullHeight && `
    height: fit-content;
  `}
  
  ${props =>  props.borderless &&`
    border: none;
  `}
`;

const HeaderStyle = styled.div<any>`
  ${props => `
    background-color: ${(props.theme.background || light.background).chartBlock};
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${HEADER_STYLES}
`;

const ContentStyle = styled.div<any>`
  overflow-y: auto;
  padding: ${PADDING_UNITS * UNIT}px;
  height: 100%;

  ${props => props.height && `
    height: ${props.height}px;
  `}
`;

export const FooterStyle = styled.div`
  border-style: ${BORDER_STYLE};
  border-top-width: ${BORDER_WIDTH}px;
  padding: ${PADDING_UNITS * UNIT}px;
`;

export type PanelProps = {
  borderless?: any;
  children?: any;
  containerRef?: any;
  contentContainerRef?: any;
  header?: JSX.Element;
  headerHeight?: number;
  headerIcon?: JSX.Element;
  headerTitle?: string;
  footer?: JSX.Element;
  fullHeight?: boolean;
  items?: JSX.Element;
  subtitle?: JSX.Element;
};

function Panel({
  borderless,
  children,
  containerRef,
  contentContainerRef,
  footer,
  fullHeight = true,
  header,
  headerHeight,
  headerIcon,
  headerTitle,
  items,
  subtitle,
}: PanelProps) {
  return (
    <PanelStyle borderless={borderless} fullHeight={fullHeight} ref={containerRef}>
      {(header || headerTitle) &&
        <HeaderStyle height={headerHeight}>
          {header && header}
          {headerTitle &&
            <FlexContainer alignItems="center" justifyContent="space-between">
              <FlexContainer alignItems="center">
                {headerIcon && headerIcon}
                <Spacing ml={headerIcon ? 1 : 0}>
                  <Text bold default>
                    {headerTitle}
                  </Text>
                </Spacing>
              </FlexContainer>
              { items &&
                <>
                  {items}
                </> 
              }
            </FlexContainer>
          }
          { subtitle &&
          <>
            <Spacing mb={2}/>
            <FlexContainer alignItems="right">
              {subtitle}
            </FlexContainer>
          </>
          }
        </HeaderStyle>
      }
      <ContentStyle ref={contentContainerRef}>
        {children}
      </ContentStyle>
      {footer &&
        <FooterStyle>
          <FlexContainer alignItems="center" justifyContent="center">
            {footer}
          </FlexContainer>
        </FooterStyle>
      }
    </PanelStyle>
  );
}

export default Panel;
