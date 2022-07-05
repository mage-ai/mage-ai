import React, { useContext } from 'react';
import KernelType from '@interfaces/KernelType';

type KernelContextType = {
  fetchKernels: () => void;
  interruptKernel: () => void;
  kernel: KernelType;
  restartKernel: () => void;
};

const KernelContext = React.createContext<KernelContextType>({
  kernel: null,
});

export const useKernelContext = () => useContext(KernelContext);

export default KernelContext;
