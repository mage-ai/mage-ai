import React from 'react';
import styled from 'styled-components';
import { CSSTransition } from 'react-transition-group';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { ChevronDown } from '@oracle/icons';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss }  from '@oracle/styles/scrollbars';
import { SHARED_LINK_STYLES } from '@oracle/elements/Link';
import { UNIT } from '@oracle/styles/units/spacing';
import { outline } from '@oracle/styles/mixins';

export const ANIMATION_DURATION_CONTENT = 300;

export type AccordionPanelProps = {
  beforeTitleElement?: any;
  contentOverflowVisible?: boolean;
  first?: boolean;
  hideScrollbar?: boolean;
  highlighted?: boolean;
  id?: string;
  last?: boolean;
  maxHeight?: number;
  noBackground?: boolean;
  noBorderRadius?: boolean;
  noHoverUnderline?: boolean;
  noPaddingContent?: boolean;
  refContainer?: any;
  singlePanel?: boolean;
  smallTitle?: boolean;
  titleXPadding?: number;
  titleYPadding?: number;
  unboundedTitle?: boolean;
  visible?: boolean;
  visibleCount?: number;
  visibleHighlightDisabled?: boolean;
};

type AccordionPanelInternalProps = {
  children?: any;
  onClick?: (e: Event) => void;
  onEntered?: (element: any) => void;
  onExited?: (element: any) => void;
  title: string | any;
};

const AccordionPanelStyle = styled.div<AccordionPanelProps>`
  .accordion-panel-chevron-down-exit-done {
    transform: rotate(0deg);
    transition: all 200ms;
  }
  .accordion-panel-chevron-down-enter-active {
    transform: rotate(180deg);
    transition: all 200ms;
  }
  .accordion-panel-chevron-down-enter-done,
  .accordion-panel-chevron-down-enter-done-visible {
    transform: rotate(180deg);
    transition: all 300ms;
  }
  .accordion-panel-chevron-down-exit {
    transform: rotate(0deg);
    transition: all 300ms;
  }

  .accordion-panel-content-enter {
    display: block;
    max-height: 0px;
    overflow: hidden;
    transition: max-height 400ms ease-in-out;
  }
  .accordion-panel-content-enter-active {
    max-height: 100vh;
    ${props => props.maxHeight && `
      max-height: ${props.maxHeight}px;
    `}
  }
  .accordion-panel-content-enter-done {
    display: block;
  }

  .accordion-panel-content-exit {
    display: block;
    max-height: 100vh;
    ${props => props.maxHeight && `
      max-height: ${props.maxHeight}px;
    `}
    overflow: hidden;
  }
  .accordion-panel-content-exit-active {
    max-height: 0px;
    transition: max-height 300ms cubic-bezier(0, 1, 0, 1);
  }
  .accordion-panel-content-exit-done {
    display: none;
  }
`;

const TitleStyle = styled.a<AccordionPanelProps>`
  ${SHARED_LINK_STYLES}
  display: block;
  position: relative;
  z-index: 1;

  ${props => `
    &:hover,
    &:focus {
      outline: none;
    }
    ${outline(props)}

    background-color: ${(props.theme.background || dark.background).table};

    &:hover {
      background-color: ${(props.theme || dark)?.background?.page};
    }

    &:active {
      background-color: ${(props.theme || dark)?.background?.page};
    }
  `}

  ${props => props.visible && `
    border-bottom: 1px solid ${(props.theme || dark)?.borders?.medium2};
  `}

  ${props => !props.first && props.visible && `
    border-top: 1px solid ${(props.theme || dark)?.borders?.medium2};
  `}

  ${props => !props.noBorderRadius && props.first && `
    border-top-left-radius: ${BORDER_RADIUS}px;
    border-top-right-radius: ${BORDER_RADIUS}px;
  `}

  ${props => !props.noBorderRadius && (props.last || props.singlePanel) && !props.visible && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
  `}

  ${props => typeof props.titleXPadding !== 'undefined' && `
    padding-left: ${props.titleXPadding}px;
    padding-right: ${props.titleXPadding}px;
  `}

  ${props => typeof props.titleXPadding === 'undefined' && `
    padding-left: ${2 * UNIT}px;
    padding-right: ${2 * UNIT}px;
  `}

  ${props => typeof props.titleYPadding !== 'undefined' && `
    padding-bottom: ${props.titleYPadding}px;
    padding-top: ${props.titleYPadding}px;
  `}

  ${props => typeof props.titleYPadding === 'undefined' && `
    padding-bottom: ${2 * UNIT}px;
    padding-top: ${2 * UNIT}px;
  `}
`;

const ContentStyle = styled.div<AccordionPanelProps>`
  padding-left: ${UNIT * 2}px;
  padding-right: ${UNIT * 2}px;
  ${ScrollbarStyledCss}

  ${props => props.hideScrollbar && `
    ::-webkit-scrollbar {
      display: none;
    }
  `}

  ${props => !props.visible && `
    display: none;
  `}

  ${props => !props.contentOverflowVisible && `
    overflow-y: auto;
  `}

  ${props => props.contentOverflowVisible && `
    overflow-y: visible;
  `}

  ${props => props.maxHeight && `
    max-height: ${props.maxHeight}px;
  `}

  ${props => props.noPaddingContent && `
    padding: 0;
  `}
`;

const ContentInnerStyle = styled.div<AccordionPanelProps>`
  padding-bottom: ${UNIT * 2}px;
  padding-top: ${UNIT * 2}px;

  ${props => (props.noPaddingContent) && `
    padding: 0;
  `}
`;

const AccordionPanel = ({
  beforeTitleElement,
  children,
  contentOverflowVisible,
  first,
  hideScrollbar,
  highlighted,
  last,
  maxHeight,
  noBackground,
  noBorderRadius,
  noPaddingContent,
  onClick,
  onEntered,
  onExited,
  refContainer,
  singlePanel,
  smallTitle,
  title,
  titleXPadding,
  titleYPadding,
  unboundedTitle,
  visible,
  visibleCount,
  visibleHighlightDisabled,
  ...props
}: AccordionPanelProps & AccordionPanelInternalProps, ref) => (
  <AccordionPanelStyle
    {...props}
    maxHeight={maxHeight}
    ref={refContainer}
  >
    <TitleStyle
      first={first}
      href="#"
      last={last}
      noBorderRadius={noBorderRadius}
      noHoverUnderline
      onClick={(e: any) => {
        e.preventDefault();
        if (onClick) {
          onClick(e);
        }
      }}
      onKeyPress={(e: any) => {
        if (e.key === ' ') {
          if (onClick) {
            onClick(e);
          }
        }
      }}
      singlePanel={singlePanel}
      titleXPadding={titleXPadding}
      titleYPadding={titleYPadding}
      visible={visible && !visibleHighlightDisabled}
    >
      <FlexContainer alignItems="center" justifyContent="space-between">
        {unboundedTitle && beforeTitleElement}

        {!unboundedTitle && (
          <FlexContainer alignItems="center">
            {beforeTitleElement}

            {beforeTitleElement && <Spacing ml={1} />}

            {typeof title !== 'string' && title}

            {typeof title === 'string' && (
              <Text
                bold
                default={!visible}
                large={!smallTitle}
                wind={highlighted}
              >
                {title}
              </Text>
            )}
          </FlexContainer>
        )}
        {unboundedTitle && title}

        <Spacing mr={1} />

        <CSSTransition
          classNames="accordion-panel-chevron-down"
          in={visible}
          timeout={400}
        >
          <Flex className={visible && visibleCount === 0 && 'accordion-panel-chevron-down-enter-done-visible'}>
            <ChevronDown default size={UNIT * 2} />
          </Flex>
        </CSSTransition>
      </FlexContainer>
    </TitleStyle>

    <CSSTransition
      classNames="accordion-panel-content"
      in={visible}
      onEntered={refContentOutter => onEntered && onEntered(refContentOutter)}
      onExited={refContentOutter => onExited && onExited(refContentOutter)}
      timeout={ANIMATION_DURATION_CONTENT}
    >
      <ContentStyle
        contentOverflowVisible={contentOverflowVisible}
        hideScrollbar={hideScrollbar}
        maxHeight={maxHeight}
        noBackground={noBackground}
        noPaddingContent={noPaddingContent}
        visible={visible}
      >
        <ContentInnerStyle
          noPaddingContent={noPaddingContent}
          ref={ref}
        >
          {children}
        </ContentInnerStyle>
      </ContentStyle>
    </CSSTransition>
  </AccordionPanelStyle>
);

export default React.forwardRef(AccordionPanel);
