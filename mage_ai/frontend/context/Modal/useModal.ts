import {
  DependencyList,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ModalContext,
  ModalProps,
  ModalType,
  UseModalOptionsType,
} from './ModalContext';
import {
  generateKey,
  isFunctionalComponent,
} from '@context/shared/utils';

/**
 * Callback types provided for descriptive type-hints
 */
type ShowModal = (opts?: any) => void;
type HideModal = () => void;

/**
 * React hook for showing modal windows
 */
export const useModal = (
  component: ModalType,
  modalProps: ModalProps = {},
  inputs: DependencyList = [],
  opts: UseModalOptionsType = {},
): [ShowModal, HideModal] => {
  if (!isFunctionalComponent(component)) {
    throw new Error(
      'Only stateless components can be used as an argument to useModal. ' +
      'You have probably passed a class component where a function was expected.'
    );
  }
  const {
    uuid,
    visible,
  } = opts;

  const key = useMemo(uuid ? () => uuid : generateKey, [uuid]);
  const modal = useMemo(() => component, inputs);
  const context = useContext(ModalContext);
  const [isShown, setShown] = useState<boolean>(visible);
  const [runtimeProps, setRuntimeProps] = useState<any>({});

  const showModal = useCallback((runtimePropsArg: any = {}) => {
    setRuntimeProps(runtimePropsArg);
    setShown(true);
  }, []);
  const hideModal = useCallback(() => setShown(false), []);

  useEffect(() => {
    if (isShown) {
      context.showModal(key, modal, hideModal, modalProps, {
        ...opts,
        runtimeProps,
      });
    } else {
      context.hideModal(key);
    }

    // Hide modal when parent component unmounts
    return () => context.hideModal(key);
  }, [isShown, isShown]);

  return [showModal, hideModal];
};
