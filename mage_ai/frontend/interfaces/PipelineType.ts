import BlockType from './BlockType';
import TransformerActionType from './TransformerActionType';
import adjectives from '@utils/adjectives';
import nouns from '@utils/nouns';
import { PipelineMetadataType } from './MetadataType';
import { randomSample } from '@utils/array';

export default interface PipelineType {
  actions: TransformerActionType[];
  blocks?: BlockType[];
  id?: number;
  metadata: PipelineMetadataType;
  name?: string;
  uuid?: string;
}
