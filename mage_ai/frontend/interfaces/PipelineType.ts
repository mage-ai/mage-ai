import TransformerActionType from './TransformerActionType';
import { PipelineMetadataType } from './MetadataType';

export default interface PipelineType {
  id: number;
  metadata: PipelineMetadataType;
  actions: TransformerActionType[];
}
