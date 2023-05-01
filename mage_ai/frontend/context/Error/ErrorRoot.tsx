import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { memo, useState, useEffect } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import ErrorPopup from '@components/ErrorPopup';
import {
  ErrorObjectType,
  ErrorType,
} from './ErrorContext';

interface ErrorRootProps {
  component?: React.ComponentType<any>;
  container?: Element;
  errors: {
    [key: string]: ErrorObjectType;
  };
  hideError: (key: string) => void;
}

interface ErrorRendererProps {
  component?: ErrorType;
  onClose: () => void;
  runtimeProps?: any;
}

const ErrorRenderer = memo(({
  component,
  onClose,
  runtimeProps,
  ...rest
}: ErrorRendererProps) => {
  if (component) {
    return component({
      ...rest,
      ...runtimeProps,
    });
  }

  return (
    <ErrorPopup
      {...{
        ...rest,
        ...runtimeProps,
      }}
      onClose={onClose}
    />
  );
});

export const ErrorRoot = memo(
  ({
    component: RootComponent = React.Fragment,
    container,
    errors,
    hideError,
  }: ErrorRootProps) => {
    const [mountNode, setMountNode] = useState<Element | undefined>(undefined);
    const [visibleMapping, setVisibleMapping] = useState({});

    // This effect will not be ran in the server environment
    useEffect(() => setMountNode(container || document.body), [
      container,
      setMountNode,
    ]);

    useEffect(() => {
      const visible = Object.entries(errors || {}).reduce((acc, [key, obj]) => ({
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
      errors,
      setVisibleMapping,
    ]);

    if (!mountNode || !errors) {
      return <div />;
    }

    return ReactDOM.createPortal(
      <RootComponent>
        {Object.entries(errors).map(([key, obj]) => {
          const {
            component,
            hide: hideProp,
            hideCallback,
            runtimeProps,
          } = obj;
          const hide = () => {
            if (hideProp) {
              hideProp();
            } else if (hideError) {
              hideError(key);
            }

            if (hideCallback) {
              hideCallback();
            }
          };

          const visible = visibleMapping[key];

          return (
            <ClickOutside
              disableClickOutside
              key={key}
              onClickOutside={hide}
              open={visible}
            >
              <ErrorRenderer
                component={component}
                onClose={hide}
                runtimeProps={runtimeProps}
              />
            </ClickOutside>
          );
        })}
      </RootComponent>,
      mountNode,
    );
  },
);
