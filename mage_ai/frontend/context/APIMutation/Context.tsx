import * as React from 'react';

export interface APIErrorType {
  message: string;
  name: string;
  config: {
    headers: {
      Accept: string;
      'Content-Type': string;
    };
    data: string;
    method: string;
    onDownloadProgress: any;
    onUploadProgress: any;
    responseType: string;
    signal: any;
    url: string;
  };
  code: string;
  status: number;
}

export type APIMutationProviderProps = {
  children: React.ReactNode;
};

export interface APIMutationContextType {
  dismissError: () => void;
  renderError: (error: APIErrorType) => void;
}

const invariantViolation = () => {
  throw new Error(
    `Attempted to call useMutate outside of APIMutation Context.
    Make sure your app is rendered inside APIMutationProvider.`,
  );
};

export const APIMutationContext = React.createContext<APIMutationContextType>({
  dismissError: invariantViolation,
  renderError: invariantViolation,
});
APIMutationContext.displayName = 'APIMutationContext';
