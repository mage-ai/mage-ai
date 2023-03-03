import styled, { css } from 'styled-components';

import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';

import { BORDER_RADIUS, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

const HEADER_PADDING_Y_UNITS = 1.5;
const PADDING_UNITS = 1.75;

const HEADER_STYLES = css`
  padding: ${2 * UNIT}px;
  padding-bottom: ${HEADER_PADDING_Y_UNITS * UNIT}px;
  padding-top: ${HEADER_PADDING_Y_UNITS * UNIT}px;
`;

const PanelStyle = styled.div<{
  borderless?: boolean;
  fullHeight?: boolean;
  maxHeight?: string;
  minWidth?: number;
  overflowVisible?: boolean;
}>`
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

  ${props => props.maxHeight && `
    max-height: ${props.maxHeight};
  `}

  ${props => props.minWidth && `
    min-width: ${props.minWidth}px;

    @media (max-width: ${props.minWidth}px) {
      min-width: 0;
    }
  `}

  ${props => props.borderless && `
    border: none;
  `}

  ${props => props.overflowVisible && `
    overflow: visible;
  `}
`;

const HeaderStyle = styled.div<{
  height?: number;
  headerPaddingVertical?: number;
}>`
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;

  ${props => `
    background-color: ${(props.theme.background || light.background).chartBlock};
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${HEADER_STYLES}

  ${props => props.headerPaddingVertical && `
    padding-bottom: ${props.headerPaddingVertical}px;
    padding-top: ${props.headerPaddingVertical}px;
  `}
`;

const ContentStyle = styled.div<any>`
  overflow-y: auto;
  padding: ${PADDING_UNITS * UNIT}px;
  height: 100%;
  ${ScrollbarStyledCss}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => props.maxHeight && `
    max-height: calc(${props.maxHeight} - ${UNIT * 15}px);
  `}

  ${props => props.noPadding && `
    padding: 0;
  `}

  ${props => props.overflowVisible && `
    overflow: visible;
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
  headerPaddingVertical?: number;
  headerTitle?: string;
  maxHeight?: string;
  footer?: JSX.Element;
  fullHeight?: boolean;
  noPadding?: boolean;
  overflowVisible?: boolean;
  subtitle?: string;
  minWidth?: number;
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
  headerPaddingVertical,
  headerTitle,
  maxHeight,
  noPadding,
  overflowVisible,
  subtitle,
  minWidth,
}: PanelProps) {
  return (
    <PanelStyle
      borderless={borderless}
      fullHeight={fullHeight}
      maxHeight={maxHeight}
      minWidth={minWidth}
      overflowVisible={overflowVisible}
      ref={containerRef}
    >
      {(header || headerTitle) &&
        <HeaderStyle
          headerPaddingVertical={headerPaddingVertical}
          height={headerHeight}
        >
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
            </FlexContainer>
          }
        </HeaderStyle>
      }

      <ContentStyle
        maxHeight={maxHeight}
        noPadding={noPadding}
        overflowVisible={overflowVisible}
        ref={contentContainerRef}
      >
        {subtitle &&
          <Spacing mb={2}>
            <Text default>
              {subtitle}
            </Text>
          </Spacing>
        }
        {children}
      </ContentStyle>

      {footer &&
        <FooterStyle>
          {footer}
        </FooterStyle>
      }
    </PanelStyle>
  );
}

export default Panel;
