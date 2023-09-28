import React, { useContext } from 'react';
import PipelineType from '@interfaces/PipelineType';

type PipelineContextType = {
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  pipeline: PipelineType;
  savePipelineContent: () => void;
  updatePipeline: (payload: {
    pipeline: PipelineType;
  }) => void;
};

const PipelineContext = React.createContext<PipelineContextType>({
  fetchFileTree: () => false,
  fetchPipeline: () => false,
  pipeline: {
    actions: [],
    blocks: [],
    metadata: null,
    uuid: null,
  },
  savePipelineContent: null,
  updatePipeline: null,
});

export const usePipelineContext = () => useContext(PipelineContext);

export default PipelineContext;
