import {
  DependencyList,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ErrorContext,
  ErrorProps,
  ErrorType,
  UseErrorOptionsType,
} from './ErrorContext';
import {
  generateKey,
  isFunctionalComponent,
} from '@context/shared/utils';

type HideError = () => void;
type ShowError = (opts?: any) => void;

export const useError = (
  component: ErrorType,
  errorProps: ErrorProps = {},
  inputs: DependencyList = [],
  opts: UseErrorOptionsType = {},
): [ShowError, HideError, any] => {
  if (component && !isFunctionalComponent(component)) {
    throw new Error(
      'Only stateless components can be used as an argument to useError. ' +
      'You have probably passed a class component where a function was expected.',
    );
  }
  const {
    uuid,
    visible,
  } = opts;

  const refError = useRef(null);

  const key = useMemo(uuid ? () => uuid : generateKey, [generateKey, uuid]);
  const error = useMemo(() => component, inputs);
  const context = useContext(ErrorContext);
  const [isShown, setShown] = useState<boolean>(visible);
  const [runtimeProps, setRuntimeProps] = useState<any>({});

  const showError = useCallback((runtimePropsArg: any = {}) => {
    setRuntimeProps(runtimePropsArg);
    setShown(true);
    refError.current = runtimePropsArg;
  }, []);
  const hideError = useCallback(() => {
    setShown(false);
    refError.current = null;
  }, []);

  useEffect(() => {
    if (isShown) {
      context.showError(key, error, hideError, errorProps, {
        ...opts,
        runtimeProps,
      });
    } else {
      context.hideError(key);
    }

    // Hide error when parent component unmounts
    return () => context.hideError(key);
  }, [
    context,
    error,
    errorProps,
    hideError,
    isShown,
    key,
    opts,
    runtimeProps,
  ]);

  return [showError, hideError, refError];
};
