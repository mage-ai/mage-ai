import React, { createContext } from 'react';
import { ModelManagerType } from '../interfaces';
import { MutateType } from '@api/interfaces';

interface ModelContextType {
  blocksByGroupRef: ModelManagerType['blocksByGroupRef'];
  blockMappingRef: ModelManagerType['blockMappingRef'];
  groupMappingRef: ModelManagerType['groupMappingRef'];
  groupsByLevelRef: ModelManagerType['groupsByLevelRef'];
  itemsRef?: ModelManagerType['itemsRef'];
  mutations: {
    files: MutateType;
    pipelines: MutateType;
  };
  outputsRef?: ModelManagerType['outputsRef'];
}
export const ModelContext = createContext<ModelContextType | undefined>(undefined);

interface ModelProvider extends ModelContextType {
  children: React.ReactNode;
}

export const ModelProvider: React.FC<ModelProvider> = ({ children, ...props }: ModelProvider) => (
  <ModelContext.Provider value={props}>{children}</ModelContext.Provider>
);
