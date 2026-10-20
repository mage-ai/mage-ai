import * as React from 'react';
import { ErrorType as ApiErrorType, ErrorResponseType } from '@interfaces/ErrorsType';

export type ErrorProps = {};
export type ErrorRunTimeProps = {
  displayMessage?: string;
  errors?: ApiErrorType;
  links?: {
    label: string;
    onClick: () => void;
  }[];
  onClose?: () => void;
  response?: ErrorResponseType;
};

export type ErrorType = React.FunctionComponent<any>;
export type ErrorObjectType = {
  background?: boolean;
  component: ErrorType;
  disableCloseButton?: boolean;
  disableClickOutside?: boolean;
  disableEscape?: boolean;
  hide?: () => void;
  hideCallback?: () => void;
  errorProps: ErrorProps;
  runtimeProps?: ErrorRunTimeProps;
  visible: boolean;
};

export type UseErrorOptionsType = {
  background?: boolean;
  disableCloseButton?: boolean;
  disableClickOutside?: boolean;
  disableEscape?: boolean;
  hideCallback?: () => void;
  runtimeProps?: ErrorRunTimeProps;
  uuid?: string;
  visible?: boolean;
};

export interface ErrorContextType {
  hideError(key: string): void;
  showError(
    key: string,
    component: ErrorType,
    hideError: (key: string) => void,
    errorProps: ErrorProps,
    opts?: UseErrorOptionsType,
  ): void;
}

const invariantViolation = () => {
  throw new Error(
    'Attempted to call useError outside of Error context. Make sure your app is rendered inside ErrorProvider.',
  );
};

export const ErrorContext = React.createContext<ErrorContextType>({
  hideError: invariantViolation,
  showError: invariantViolation,
});
ErrorContext.displayName = 'ErrorContext';
