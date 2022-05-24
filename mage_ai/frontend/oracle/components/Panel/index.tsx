import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  ContentStyle,
  FooterStyle,
  HeaderStyle,
  PanelStyle,
} from '@oracle/components/Panel/index.style';
import { UNIT } from '@oracle/styles/units/spacing';

export type PanelProps = {
  children?: any;
  containerRef?: any;
  contentContainerRef?: any;
  header?: JSX.Element;
  headerHeight?: number;
  headerIcon?: JSX.Element;
  headerTitle?: string;
  footer?: JSX.Element;
  fullHeight?: boolean;
};

const PANEL_HEADER_HEIGHT = 6.5 * UNIT;
const PANEL_FOOTER_HEIGHT = 6.5 * UNIT;
const HEADERS_HEIGHT_OFFSET = 6 * UNIT;

function Panel({
  children,
  containerRef,
  contentContainerRef,
  footer,
  fullHeight = true,
  header,
  headerHeight,
  headerIcon,
  headerTitle,
}: PanelProps) {

  const height = 100

  let contentSectionHeight = height - HEADERS_HEIGHT_OFFSET;

  if (headerTitle || header) {
    contentSectionHeight -= (headerHeight || PANEL_HEADER_HEIGHT);
  }
  if (footer) {
    contentSectionHeight -= PANEL_FOOTER_HEIGHT;
  }

  return (
    <PanelStyle ref={containerRef}>
      {(header || headerTitle) &&
        <HeaderStyle height={headerHeight}>
          {header && header}
          {headerTitle &&
            <FlexContainer alignItems="center" justifyContent="space-between">
              <FlexContainer alignItems="center">
                {headerIcon && headerIcon}
                <Spacing ml={headerIcon ? 1 : 0}>
                  <Text bold>
                    {headerTitle}
                  </Text>
                </Spacing>
              </FlexContainer>
            </FlexContainer>
          }
        </HeaderStyle>
      }
      <ContentStyle height={fullHeight && contentSectionHeight} ref={contentContainerRef}>
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
