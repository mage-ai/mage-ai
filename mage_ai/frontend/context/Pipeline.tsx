import React, { useContext } from 'react';
import PipelineType from '@interfaces/PipelineType';

type PipelineContextType = {
  fetchPipeline: () => void;
  pipeline: PipelineType;
  updatePipeline: (payload: {
    pipeline: PipelineType;
  }) => void;
};

const PipelineContext = React.createContext<PipelineContextType>({
  fetchPipeline: () => false,
  pipeline: {
    actions: [],
    blocks: [],
    metadata: null,
  },
  updatePipeline: null,
});

export const usePipelineContext = () => useContext(PipelineContext);

export default PipelineContext;
