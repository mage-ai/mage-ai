import * as React from 'react';
import { useCallback, useState, useMemo } from 'react';

import {
  ModalContext,
  ModalObjectType,
  ModalType,
  UseModalOptionsType,
} from './ModalContext';
import { ModalRoot } from './ModalRoot';
import { hideSheets } from '@context/Sheet/utils';

/**
 * Modal Provider Props
 */
export interface ModalProviderProps {
  /**
   * Specifies the root element to render modals into
   */
  container?: Element;

  /**
   * Container component for modal nodes
   */
  rootComponent?: React.ComponentType<any>;

  /**
   * Subtree that will receive modal context
   */
  children: React.ReactNode;
}

/**
 * Modal Provider
 *
 * Provides modal context and renders ModalRoot.
 */
export const ModalProvider = ({
  children,
  container,
  rootComponent,
}: ModalProviderProps) => {
  if (container && !(container instanceof HTMLElement)) {
    throw new Error(`Container must specify DOM element to mount modal root into.

    This behavior has changed in 3.0.0. Please use \`rootComponent\` prop instead.
    See: https://github.com/mpontus/react-modal-hook/issues/18`);
  }
  const [modals, setModals] = useState<Record<string, ModalObjectType>>();

  const hideModal = useCallback(
    (
      key: string,
    ) => setModals(modals => hideSheets(key, modals)),
    [],
  );

  const showModal = useCallback((
    key: string,
    modal: ModalType,
    hide: (key: string) => void,
    modalProps: any,
    opts?: UseModalOptionsType,
    // @ts-ignore
  ) => setModals(modals => ({
    ...modals,
    [key]: {
      ...opts,
      component: modal,
      hide,
      modalProps,
      visible: true,
    },
  })), []);

  const contextValue = useMemo(() => ({ showModal, hideModal }), [hideModal, showModal]);

  return (
    // @ts-ignore
    <ModalContext.Provider value={contextValue}>
      <>
        {children}
        <ModalRoot
          component={rootComponent}
          container={container}
          modals={modals}
        />
      </>
    </ModalContext.Provider>
  );
};
