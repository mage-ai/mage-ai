import styled, { css } from 'styled-components';

import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
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
  dark?: boolean;
  fullHeight?: boolean;
  fullWidth?: boolean;
  maxHeight?: string;
  maxWidth?: number;
  minWidth?: number;
  noBackground?: boolean;
  overflowVisible?: boolean;
  success?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  overflow: hidden;

  ${props => props.fullWidth && `
    width: 100%;
  `}

  ${props => !props.borderless && `
    border: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}

  ${props => !props.noBackground && props.success && `
    background-color: ${(props.theme.background || dark.background).successLight};
  `}

  ${props => props.success && !props.borderless && `
    border: 1px solid ${(props.theme.background || dark.background).success};
  `}

  ${props => !props.noBackground && !props.dark && !props.success && `
    background-color: ${(props.theme.background || dark.background).panel};
  `}

  ${props => !props.noBackground && props.dark && `
    background-color: ${(props.theme.background || dark.background).content};
  `}

  ${props => !props.fullHeight && `
    height: fit-content;
  `}

  ${props => props.maxHeight && `
    max-height: ${props.maxHeight};
  `}

  ${props => props.maxWidth && `
    max-width: ${props.maxWidth}px;
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
    background-color: ${(props.theme.background || dark.background).chartBlock};
    border-bottom: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
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
  dark?: boolean;
  fullWidth?: boolean;
  footer?: JSX.Element;
  fullHeight?: boolean;
  header?: JSX.Element;
  headerHeight?: number;
  headerIcon?: JSX.Element;
  headerPaddingVertical?: number;
  headerTitle?: string;
  maxHeight?: string;
  maxWidth?: number;
  minWidth?: number;
  noBackground?: boolean;
  noPadding?: boolean;
  overflowVisible?: boolean;
  subtitle?: JSX.Element | string;
  success?: boolean;
};

function Panel({
  borderless,
  children,
  containerRef,
  contentContainerRef,
  dark,
  footer,
  fullHeight = true,
  fullWidth = true,
  header,
  headerHeight,
  headerIcon,
  headerPaddingVertical,
  headerTitle,
  maxHeight,
  maxWidth,
  minWidth,
  noBackground,
  noPadding,
  overflowVisible,
  subtitle,
  success,
}: PanelProps) {
  return (
    <PanelStyle
      borderless={borderless}
      dark={dark}
      fullHeight={fullHeight}
      fullWidth={fullWidth}
      maxHeight={maxHeight}
      maxWidth={maxWidth}
      minWidth={minWidth}
      noBackground={noBackground}
      overflowVisible={overflowVisible}
      ref={containerRef}
      success={success}
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
        {subtitle && typeof subtitle === 'string' &&
          <Spacing mb={2}>
            <Text default>
              {subtitle}
            </Text>
          </Spacing>
        }
        {subtitle && typeof subtitle !== 'string' && subtitle}
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
