import * as React from 'react';

export type ModalProps = {
};

export type ModalType = React.FunctionComponent<any>;
export type ModalObjectType = {
  background?: boolean;
  component: ModalType;
  disableCloseButton?: boolean;
  disableClickOutside?: boolean;
  disableEscape?: boolean;
  hide?: () => void;
  hideCallback?: () => void;
  modalProps: ModalProps;
  runtimeProps?: any;
  visible: boolean;
};

export type UseModalOptionsType = {
  background?: boolean;
  disableCloseButton?: boolean;
  disableClickOutside?: boolean;
  disableEscape?: boolean;
  hideCallback?: () => void;
  runtimeProps?: any;
  uuid?: string;
  visible?: boolean;
};

export interface ModalContextType {
  hideModal(key: string): void;
  showModal(
    key: string,
    component: ModalType,
    hideModal: (key: string) => void,
    modalProps: ModalProps,
    opts?: UseModalOptionsType,
  ): void;
}

const invariantViolation = () => {
  throw new Error(
    'Attempted to call useModal outside of modal context. Make sure your app is rendered inside ModalProvider.'
  );
};

export const ModalContext = React.createContext<ModalContextType>({
  hideModal: invariantViolation,
  showModal: invariantViolation,
});
ModalContext.displayName = 'ModalContext';
