import React, { useContext, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';

import ErrorManager from './ErrorManager';
import { APIErrorType, APIMutationContext, APIMutationProviderProps } from './Context';
import { isDebug } from '@utils/environment';

const ROOT_ID = 'api-mutation-root';

export const APIMutationProvider: React.FC<APIMutationProviderProps> = ({
  children,
}) => {
  const themeContext = useContext(ThemeContext);
  const errorRef = useRef<APIErrorType>(null);
  const errorElementRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<Root | null>(null);

  function dismissError() {
    errorRef.current = null;
    rootRef?.current && (rootRef.current as any).render(null);
  }

  function renderError(error: APIErrorType) {
    isDebug() && console.error(errorRef.current);

    errorRef.current = error;
    const element = errorElementRef?.current
      || (errorElementRef.current = document.getElementById(ROOT_ID));
    (rootRef as { current: any }).current ||= createRoot(element);
    (rootRef.current as any).render(
      <ThemeProvider theme={themeContext}>
        <ErrorManager dismissError={dismissError} errorRef={errorRef} />
      </ThemeProvider>,
    );
  }

  return (
    <APIMutationContext.Provider value={{ dismissError, renderError } as any}>
      <>
        {children}
        <div id={ROOT_ID} />
      </>
    </APIMutationContext.Provider>
  );
};
