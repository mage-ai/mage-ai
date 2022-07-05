import React, { useContext } from 'react';
import KernelOutputType from '@interfaces/KernelOutputType';
import KernelType from '@interfaces/KernelType';

type KernelContextType = {
  fetchKernels: () => void;
  interruptKernel: () => void;
  kernel: KernelType;
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  restartKernel: () => void;
  setMessages: (messages: {
    [uuid: string]: KernelOutputType[];
  }) => void;
};

const KernelContext = React.createContext<KernelContextType>({
  fetchKernels: null,
  interruptKernel: null,
  kernel: null,
  messages: {},
  restartKernel: null,
  setMessages: null,
});

export const useKernelContext = () => useContext(KernelContext);

export default KernelContext;
