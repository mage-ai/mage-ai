import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
import { CSSTransition } from 'react-transition-group';
import { media } from 'styled-bootstrap-grid';
import { memo, useState, useEffect } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import Link from '@oracle/elements/Link';
import dark from '@oracle/styles/themes/dark';
import { Close } from '@oracle/icons';
import {
  ModalObjectType,
  ModalType,
} from './ModalContext';
import { UNIT } from '@oracle/styles/units/spacing';

const CLOSE_SIZE = UNIT * 3;
const PADDING_VERTICAL = UNIT * 3;

const CloseLinkStyle = styled.div`
  border-radius: 50%;
  height: ${CLOSE_SIZE + (UNIT * 2)}px;
  padding: ${UNIT * 1}px;
  position: fixed;
  width: ${CLOSE_SIZE + (UNIT * 2)}px;
  z-index: 10;

  ${media.xs`
    right: ${UNIT * 2}px;
    top: ${UNIT * 2}px;
  `}

  ${media.sm`
    right: ${UNIT * 2}px;
    top: ${UNIT * 2}px;
  `}

  ${media.md`
    right: ${UNIT * 3}px;
    top: ${UNIT * 3}px;
  `}

  ${media.lg`
    right: ${UNIT * 5}px;
    top: ${UNIT * 5}px;
  `}

  ${props => `
    background-color: ${(props.theme.background || dark.background).dialog};
  `}
`;

/**
 * Modal Root Props
 */
interface ModalRootProps {
  /**
   * Map of modal instances associated by unique ids
   */
  modals: {
    [key: string]: ModalObjectType;
  };

  /**
   * Container component for modals
   *
   * Modals will be rendered as children of this component. React.Fragment is
   * used by defualt, specifying a different component can change the way modals
   * are rendered across the whole application.
   */
  component?: React.ComponentType<any>;

  /**
   * Specifies the root element to render modals into
   */
  container?: Element;
}

/**
 * Modal renderer props
 */
interface ModalRendererProps {
  /**
   * Functional component representing the modal
   */
  component: ModalType;
  runtimeProps?: any;
}

/**
 * Component responsible for rendering the modal.
 *
 * The identity of `Component` may change dependeing on the inputs passed to
 * `useModal`. If we simply rendered `<Component />` then the modal would be
 * susceptible to rerenders whenever one of the inputs change.
 */
const ModalRenderer = memo(({
  component,
  runtimeProps,
  ...rest
}: ModalRendererProps) => component({
  ...rest,
  ...runtimeProps,
}));

/**
 * Modal Root
 *
 * Renders modals using react portal.
 */

const ANIMATION_DURATION = 100;
const SCALE_STARTING = 0.97;

const ContainerStyle = styled.div`
  position: fixed;
  z-index: 100;

  .global-modal-enter-active {
    opacity: 0;
    transform: scale(${SCALE_STARTING}, ${SCALE_STARTING});
    transition: all ${ANIMATION_DURATION}ms linear;
  }

  .global-modal-enter-done {
    opacity: 1;
    transform: scale(1, 1);
    transition: all ${ANIMATION_DURATION}ms linear;
  }

  .global-modal-exit {
    opacity: 1;
    transform: scale(1, 1);
  }
  .global-modal-exit-active {
    opacity: 0;
    transform: scale(${SCALE_STARTING}, ${SCALE_STARTING});
    transition: all ${ANIMATION_DURATION}ms linear;
  }
  .global-modal-exit-done {
    opacity: 0;
    transform: scale(${SCALE_STARTING}, ${SCALE_STARTING});
    transition: all ${ANIMATION_DURATION}ms linear;
  }

  .global-modal-enter-done {
    opacity: 1;
    transform: scale(1, 1);
    transition: all ${ANIMATION_DURATION}ms linear;
  }

  .background-style-exit {
    opacity: 1;
  }
  .background-style-exit-active {
    opacity: 0;
    transition: all ${ANIMATION_DURATION}ms linear;
  }
  .background-style-exit-done {
    opacity: 0;
    transition: all ${ANIMATION_DURATION}ms linear;
  }
`;

export const ModalBackgroundStyle = styled.div`
  -webkit-tap-highlight-color: transparent;
  background-color: rgba(0, 0, 0, 0.3);
  bottom: 0;
  left: 0;
  opacity: 1;
  position: fixed;
  right: 0;
  top: 0;
  touch-action: none;
  transition: all ${ANIMATION_DURATION}ms linear;
  will-change: opacity;
  z-index: 60;
`;

const OverlayStyle = styled.div`
  background-color: transparent;
  height: 100%;
  inset: 0;
  opacity: 0;
  overflow-y: auto;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
`;

const ContentStyle = styled.div`
  align-items: center;
  background: none;
  border-radius: 0px;
  border: none;
  display: flex;
  min-height: 100%;
  inset: 0px;
  justify-content: center;
  opacity: 1;
  outline: none;
  overflow: hidden;
  padding-bottom: ${PADDING_VERTICAL}px;
  padding-top: ${PADDING_VERTICAL}px;
  position: relative;
  transition: all ${ANIMATION_DURATION}ms linear;
  will-change: opacity;
`;

export const ModalRoot = memo(
  ({
    modals,
    container,
    component: RootComponent = React.Fragment
  }: ModalRootProps) => {
    const [mountNode, setMountNode] = useState<Element | undefined>(undefined);
    const [visibleMapping, setVisibleMapping] = useState({});

    // This effect will not be ran in the server environment
    useEffect(() => setMountNode(container || document.body), [
      container,
      setMountNode,
    ]);

    useEffect(() => {
      const visible = Object.entries(modals || {}).reduce((acc, [key, obj]) => ({
        ...acc,
        [key]: obj.visible,
      }), {});

      setTimeout(() => setVisibleMapping(visible), 1);

      const anyVisible = Object.values(visible).filter(val => val).length >= 1;

      if (anyVisible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }, [
      modals,
      setVisibleMapping,
    ]);

    if (!mountNode || !modals) {
      return <div />;
    }

    return ReactDOM.createPortal(
      <RootComponent>
        {Object.entries(modals).map(([key, obj]) => {
          const {
            background,
            component,
            disableCloseButton,
            disableClickOutside,
            disableEscape,
            hide: hideProp,
            hideCallback,
            runtimeProps,
          } = obj;
          const hide = () => {
            hideProp();

            if (hideCallback) {
              hideCallback();
            }
          };

          const visible = visibleMapping[key];

          return (
            <ContainerStyle key={key}>
              <CSSTransition
                classNames="global-modal"
                in={visible}
                timeout={ANIMATION_DURATION}
                unmountOnExit
              >
                <OverlayStyle>
                  <ContentStyle>
                    <ClickOutside
                      disableClickOutside={disableClickOutside}
                      disableEscape={disableEscape}
                      isOpen
                      onClickOutside={hide}
                    >
                      {!disableCloseButton && (
                        <CloseLinkStyle>
                          <Link
                            block
                            onClick={hide}
                            preventDefault
                            sameColorAsText
                          >
                            <Close size={CLOSE_SIZE} />
                          </Link>
                        </CloseLinkStyle>
                      )}

                      <ModalRenderer
                        component={component}
                        runtimeProps={runtimeProps}
                      />
                    </ClickOutside>
                  </ContentStyle>
                </OverlayStyle>
              </CSSTransition>

              {background && (
                <CSSTransition
                  classNames="background-style"
                  in={visible}
                  timeout={ANIMATION_DURATION}
                  unmountOnExit
                >
                  <ModalBackgroundStyle />
                </CSSTransition>
              )}
            </ContainerStyle>
          );
        })}
      </RootComponent>,
      mountNode,
    );
  },
);
