import React, { useContext } from 'react';
import PipelineType from '@interfaces/PipelineType';

type PipelineContextType = {
  fetchPipeline: () => void;
  pipeline: PipelineType;
};

const PipelineContext = React.createContext<PipelineContextType>({
  fetchPipeline: () => false,
  pipeline: {
    blocks: [],
  },
});

export const usePipelineContext = () => useContext(PipelineContext);

export default PipelineContext;
