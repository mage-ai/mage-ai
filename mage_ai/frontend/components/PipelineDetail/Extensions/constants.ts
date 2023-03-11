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
  onChangeCallbackBlock: (type: string, uuid: string, value: string) => void;
  onChangeCodeBlock: (type: string, uuid: string, value: string) => void;
  pipeline: PipelineType;
};
