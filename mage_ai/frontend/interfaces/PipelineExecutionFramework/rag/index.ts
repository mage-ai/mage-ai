import DataPreparation from './dataPreparation';
import Inference from './inference';
import PipelineExecutionFrameworkType from '../interfaces';
import { BlockTypeEnum } from '../../BlockType';
import { PipelineExecutionFrameworkUUIDEnum } from '../types';
import { PipelineTypeEnum } from '../../PipelineType';

const RAG: PipelineExecutionFrameworkType = {
  uuid: PipelineExecutionFrameworkUUIDEnum.RAG,
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK,
  blocks: [
    {
      uuid: DataPreparation.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
    {
      uuid: Inference.uuid,
      type: BlockTypeEnum.PIPELINE,
    },
  ],
};

export default RAG;
