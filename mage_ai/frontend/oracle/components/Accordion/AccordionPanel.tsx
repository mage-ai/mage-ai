import React from 'react';
import styled from 'styled-components';
import { CSSTransition } from 'react-transition-group';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { ArrowRight } from '@oracle/icons';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { SHARED_LINK_STYLES } from '@oracle/elements/Link';
import { UNIT } from '@oracle/styles/units/spacing';
import { outline } from '@oracle/styles/mixins';

export type AccordionPanelProps = {
  beforeTitleElement?: any;
  contentOverflowVisible?: boolean;
  first?: boolean;
  last?: boolean;
  maxHeight?: number;
  noBackground?: boolean;
  noHoverUnderline?: boolean;
  noPaddingContent?: boolean;
  smallTitle?: boolean;
  titleXPadding?: number;
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
  .accordion-panel-chevron-right-exit-done {
    transform: rotate(0deg);
    transition: all 200ms;
  }
  .accordion-panel-chevron-right-enter-active {
    transform: rotate(90deg);
    transition: all 200ms;
  }
  .accordion-panel-chevron-right-enter-done,
  .accordion-panel-chevron-right-enter-done-visible {
    transform: rotate(90deg);
    transition: all 300ms;
  }
  .accordion-panel-chevron-right-exit {
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
    ${props => props.maxHeight && `
      max-height: ${props.maxHeight}px;
    `}
  }
  .accordion-panel-content-enter-done {
    display: block;
  }

  .accordion-panel-content-exit {
    display: block;
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
  padding: ${UNIT * 2.5}px ${UNIT * 2}px;
  z-index: 1;

  ${props => !props.last && props.visible && `
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}

  ${props => props.first && `
    border-top-left-radius: ${BORDER_RADIUS}px;
    border-top-right-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.last && !props.visible && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
  `}

  ${props => `
    &:hover,
    &:focus {
      outline: none;
    }

    ${outline(props)}
  `}

  ${props => `
    &:hover {
      background-color: ${(props.theme.interactive || light.interactive).hoverBackground};
    }

    &:active {
      background-color: ${(props.theme.interactive || light.interactive).activeOverlay};
    }
  `}

  ${props => !props.visible && `
    background-color: ${(props.theme.background || light.background).header};
  `}

  ${props => props.titleXPadding && `
    padding-left: ${props.titleXPadding}px;
    padding-right: ${props.titleXPadding}px;
  `}
`;

const ContentStyle = styled.div<AccordionPanelProps>`
  padding-left: ${UNIT * 2}px;
  padding-right: ${UNIT * 2}px;

  ::-webkit-scrollbar {
    display: none;
  }

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
  last,
  maxHeight = 1000,
  noBackground,
  noPaddingContent,
  onClick,
  onEntered,
  onExited,
  title,
  titleXPadding,
  visible,
  visibleCount,
  visibleHighlightDisabled,
  ...props
}: AccordionPanelProps & AccordionPanelInternalProps, ref) => (
  <AccordionPanelStyle
    {...props}
    maxHeight={maxHeight}
  >
    <TitleStyle
      first={first}
      href="#"
      last={last}
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
      titleXPadding={titleXPadding}
      visible={visible && !visibleHighlightDisabled}
    >
      <FlexContainer alignItems="center">
        <CSSTransition
          classNames="accordion-panel-chevron-right"
          in={visible}
          timeout={400}
        >
          <Flex className={visible && visibleCount === 0 && 'accordion-panel-chevron-right-enter-done-visible'}>
            <ArrowRight default />
          </Flex>
        </CSSTransition>

        <Spacing ml={1}>
          <FlexContainer alignItems="center">
            {beforeTitleElement}

            {beforeTitleElement && <Spacing ml={1} />}

            <Text
              bold
              default={!visible}
            >
              {title}
            </Text>
          </FlexContainer>
        </Spacing>
      </FlexContainer>
    </TitleStyle>

    <CSSTransition
      classNames="accordion-panel-content"
      in={visible}
      onEntered={refContentOutter => onEntered && onEntered(refContentOutter)}
      onExited={refContentOutter => onExited && onExited(refContentOutter)}
      timeout={300}
    >
      <ContentStyle
        contentOverflowVisible={contentOverflowVisible}
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
