import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
import { CSSTransition } from 'react-transition-group';
import {
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react';

import dark from '@oracle/styles/themes/dark';
import { SheetProps, SheetType, SheetObjectType } from './SheetContext';
import { UNIT } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';

type SheetRootProps = {
  component?: React.ComponentType<any>;
  container?: Element;
  sheets: {
    [key: string]: SheetObjectType;
  };
};

export type SheetRendererProps = {
  component: SheetType;
  height: number;
  width: number;
};

const SheetRenderer = memo(({ component, ...props }: SheetRendererProps) => component(
  props,
));

type SharedStyleProps = {
  height: number;
  width: number;
} & SheetProps;

const SPACING_BEHIND = UNIT * 12;

const ContainerStyle = styled.div<SharedStyleProps>`
  ${props => props.enterFromLeft && `
    .global-sheet-enter-active {
      left: -${props.maxWidth ? props.maxWidth : props.width - SPACING_BEHIND}px;
    }

    .global-sheet-enter-done {
      left: 0;
    }

    .global-sheet-exit {
      left: 0;
    }
    .global-sheet-exit-done {
      left: -${props.maxWidth ? props.maxWidth : props.width - SPACING_BEHIND}px;
    }
  `}

  ${props => props.enterFromRight && `
    .global-sheet-enter-active {
      left: ${props.width}px;
    }

    .global-sheet-enter-done {
      left: ${props.maxWidth ? props.width - props.maxWidth : SPACING_BEHIND}px;
    }

    .global-sheet-exit {
      left: ${props.maxWidth ? props.width - props.maxWidth : SPACING_BEHIND}px;
    }
    .global-sheet-exit-done {
      left: ${props.width}px;
    }
  `}

  ${props => props.enterFromBottom && `
    .global-sheet-enter-active {
      top: ${props.height}px;
    }

    .global-sheet-enter-done {
      top: ${props.maxHeight ? props.height - props.maxHeight : SPACING_BEHIND}px;
    }

    .global-sheet-exit {
      top: ${props.maxHeight ? props.height - props.maxHeight : SPACING_BEHIND}px;
    }
    .global-sheet-exit-done {
      top: ${props.height}px;
    }
  `}

  .global-sheet-enter-active {
    opacity: 0.5;
    transition: all 300ms cubic-bezier(0, 1, 0, 1);
  }

  .global-sheet-enter-done {
    opacity: 1;
    transition: all 300ms cubic-bezier(0, 1, 0, 1);
  }

  .global-sheet-exit {
    opacity: 1;
  }
  .global-sheet-exit-active {
    transition: all 200ms cubic-bezier(0, 1, 0, 1);
  }
  .global-sheet-exit-done {
    opacity: 0.5;
    transition: all 200ms cubic-bezier(0, 1, 0, 1);
  }

  .container-background-enter-active {
    opacity: 0;
    transition: all 300ms cubic-bezier(0, 1, 0, 1);
  }

  .container-background-enter-done {
    opacity: 1;
    transition: all 300ms cubic-bezier(0, 1, 0, 1);
  }

  .container-background-exit {
    opacity: 1;
  }
  .container-background-exit-active {
    transition: all 200ms cubic-bezier(0, 1, 0, 1);
  }
  .container-background-exit-done {
    opacity: 0;
    transition: all 200ms cubic-bezier(0, 1, 0, 1);
  }
`;

const SheetBackgroundStyle = styled.div`
  -webkit-tap-highlight-color: transparent;
  background-color: rgba(0, 0, 0, 0.5);
  height: 100%;
  touch-action: none;
  left: 0;
  opacity: 0;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 151;
`;

const SheetStyle = styled.div<SharedStyleProps>`
  overflow-y: auto;
  position: fixed;
  z-index: 152;

  ${props => `
    background-color: ${(props.theme.background || dark.background).dialog};
  `}

  ${props => props.enterFromLeft && `
    height: ${props.height}px;
    left: -${props.maxWidth ? props.maxWidth : props.width - SPACING_BEHIND}px;
    top: 0;
    width: ${props.maxWidth ? props.maxWidth : props.width - SPACING_BEHIND}px;
  `}

  ${props => props.enterFromRight && `
    height: ${props.height}px;
    left: ${props.width}px;
    top: 0;
    width: ${props.maxWidth || props.width - SPACING_BEHIND}px;
  `}

  ${props => props.enterFromBottom && `
    height: ${props.maxHeight || props.height - SPACING_BEHIND}px;
    left: 0;
    top: ${props.height}px;
    width: ${props.width}px;
  `}
`;

export const SheetRoot = memo(({
  component: RootComponent = React.Fragment,
  container,
  sheets,
}: SheetRootProps) => {
  const [mountNode, setMountNode] = useState<Element | undefined>(undefined);
  const [visibleMapping, setVisibleMapping] = useState({});

  const {
    height,
    width,
  } = useWindowSize();

  // This effect will not be ran in the server environment
  useEffect(() => setMountNode(container || document.body), [
    container,
    setMountNode,
  ]);

  useEffect(() => {
    const visible = Object.entries(sheets || {}).reduce((acc, [key, obj]) => ({
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
    sheets,
    setVisibleMapping,
  ]);

  useEffect(() => () => {
    document.body.style.overflow = 'unset';
  }, []);

  const handleUserKeyPress = useCallback((event) => {
    const { key } = event;

    if (key === 'Escape') {
      Object.entries(sheets || {}).forEach(([key, obj]) => {
        const {
          hideSheet,
          hideSheetCallback,
        } = obj;

        if (visibleMapping[key]) {
          hideSheet(key);

          if (hideSheetCallback) {
            hideSheetCallback();
          }
        }
      });
      event.preventDefault();
    }
  }, [
    sheets,
    visibleMapping,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleUserKeyPress);

      return () => {
        window.removeEventListener('keydown', handleUserKeyPress);
      };
    }
  }, [handleUserKeyPress]);

  if (!mountNode || !sheets) {
    return <div />;
  }

  return ReactDOM.createPortal(
    <RootComponent>
      {Object.entries(sheets).map(([key, obj]) => {
        const {
          component,
          hideSheet,
          hideSheetCallback,
          sheetProps,
        } = obj;
        const {
          enterFromBottom,
          enterFromRight,
        } = sheetProps || {};
        const enterFromLeft = sheetProps?.enterFromLeft || !(enterFromBottom || enterFromRight);
        const finalWidth = enterFromLeft || enterFromRight ? width - SPACING_BEHIND : width;
        const finalHeight = enterFromBottom ? height - SPACING_BEHIND : height;
        const hide = () => {
          hideSheet(key);

          if (hideSheetCallback) {
            hideSheetCallback();
          }
        };

        return (
          <ContainerStyle
            enterFromLeft={enterFromLeft}
            height={height}
            key={key}
            width={width}
            {...sheetProps}
          >
            <CSSTransition
              classNames="global-sheet"
              in={visibleMapping[key]}
              timeout={300}
            >
              <SheetStyle
                enterFromLeft={enterFromLeft}
                height={height}
                width={width}
                {...sheetProps}
              >
                <SheetRenderer
                  component={component}
                  height={finalHeight}
                  width={finalWidth}
                />
              </SheetStyle>
            </CSSTransition>

            <CSSTransition
              classNames="container-background"
              in={visibleMapping[key]}
              timeout={300}
              unmountOnExit
            >
              <SheetBackgroundStyle onClick={hide} />
            </CSSTransition>
          </ContainerStyle>
        );
      })}
    </RootComponent>,
    mountNode
  );
});
