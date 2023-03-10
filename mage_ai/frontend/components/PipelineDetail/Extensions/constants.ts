import BlockType, {
  BlockRequestPayloadType,
} from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';

export type ExtensionProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  deleteBlock: (block: BlockType) => Promise<any>;
  pipeline: PipelineType;
};
