import React, { useContext } from 'react';

type SharedModalContextType = {
  hideModal: () => void;
  modalVisible: boolean,
  showCategoryValueMappingModal: (opts?: any) => void;
  showModal: (opts?: any) => void;
};

const SharedModalContext = React.createContext<SharedModalContextType>({
  hideModal: null,
  modalVisible: false,
  showCategoryValueMappingModal: null,
  showModal: null,
});

export const useSharedModalContext = () => useContext(SharedModalContext);

export default SharedModalContext;
