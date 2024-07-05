import React, { createContext } from 'react';
import { ModelManagerType } from '../interfaces';

interface ModelContextType {
  blocksByGroupRef: ModelManagerType['blocksByGroupRef'];
}
export const ModelContext = createContext<ModelContextType | undefined>(undefined);

interface ModelProvider extends ModelContextType {
  children: React.ReactNode;
}

export const ModelProvider: React.FC<ModelProvider> = ({
  children,
  ...props
}: ModelProvider) => (
  <ModelContext.Provider value={props}>
    {children}
  </ModelContext.Provider>
);
