import * as React from 'react';
import { useCallback, useState, useMemo } from 'react';

import {
  ErrorContext,
  ErrorObjectType,
  ErrorType,
  UseErrorOptionsType,
} from './ErrorContext';
import { ErrorRoot } from './ErrorRoot';
import { hideSheets } from '@context/Sheet/utils';

/**
 * Error Provider Props
 */
export interface ErrorProviderProps {
  /**
   * Specifies the root element to render Errors into
   */
  container?: Element;

  /**
   * Container component for Error nodes
   */
  rootComponent?: React.ComponentType<any>;

  /**
   * Subtree that will receive Error context
   */
  children: React.ReactNode;
}

/**
 * Error Provider
 *
 * Provides Error context and renders ErrorRoot.
 */
export const ErrorProvider = ({
  children,
  container,
  rootComponent,
}: ErrorProviderProps) => {
  if (container && !(container instanceof HTMLElement)) {
    throw new Error(`Container must specify DOM element to mount Error root into.

    This behavior has changed in 3.0.0. Please use \`rootComponent\` prop instead.
    See: https://github.com/mpontus/react-Error-hook/issues/18`);
  }
  const [errors, setErrors] = useState<Record<string, ErrorObjectType>>();

  const hideError = useCallback(
    (
      key: string,
    ) => setErrors(errors => hideSheets(key, errors)),
    [],
  );

  const showError = useCallback((
    key: string,
    error: ErrorType,
    hide: (key: string) => void,
    errorProps: any,
    opts?: UseErrorOptionsType,
    // @ts-ignore
  ) => setErrors(errors => ({
    ...errors,
    [key]: {
      ...opts,
      component: error,
      errorProps,
      hide,
      visible: true,
    },
  })), []);

  const contextValue = useMemo(() => ({ hideError, showError }), [hideError, showError]);

  return (
    // @ts-ignore
    <ErrorContext.Provider value={contextValue}>
      <>
        {children}
        <ErrorRoot
          component={rootComponent}
          container={container}
          errors={errors}
          hideError={hideError}
        />
      </>
    </ErrorContext.Provider>
  );
};
