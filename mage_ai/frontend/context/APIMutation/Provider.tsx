import * as React from 'react';
import { useRef } from 'react';

import { APIErrorType, APIMutationContext, APIMutationProviderProps } from './Context';
import { isDebug } from '@utils/environment';

const ROOT_ID = 'api-mutation-root';

export const APIMutationProvider: React.FC<APIMutationProviderProps> = ({
  children,
}) => {
  const errorsRef = useRef<APIErrorType>(null);

  function dismissError() {
    errorsRef.current = null;
  }

  function renderError(error: APIErrorType) {
    errorsRef.current = error;
    isDebug() && console.error(errorsRef.current);
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
