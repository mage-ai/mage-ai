import React, { ComponentType, useCallback } from 'react';

type LoggingType = {
  action?: string;
  component?: string;
  page: string;
  tags?: {
    [key: string]: string;
  };
  uuid?: string;
};

export type WithLoggingProps = {
  onClick: (event: React.MouseEvent) => void;
  logEvent?: LoggingType;
};

const useWithLogging = <P extends object>(Component: ComponentType<P>) => {
  const WrappedComponent: React.FC<P & WithLoggingProps> = props => {
    const { logEvent, onClick, ...restProps } = props;

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (logEvent || true) {
          console.log('Logging event', {
            action: 'click',
            component: Component.displayName || Component.name || 'Unknown',
            ...logEvent,
          });
        }

        if (onClick) {
          onClick(event);
        }
      },
      [logEvent, onClick],
    );

    return <Component {...(restProps as P)} onClick={handleClick} />;
  };

  return WrappedComponent;
};

export default useWithLogging;
