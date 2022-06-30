import BlockType from './BlockType';
import TransformerActionType from './TransformerActionType';
import { PipelineMetadataType } from './MetadataType';

export default interface PipelineType {
  actions: TransformerActionType[];
  blocks?: BlockType[];
  id: number;
  metadata: PipelineMetadataType;
  name?: string;
  uuid?: string;
}
