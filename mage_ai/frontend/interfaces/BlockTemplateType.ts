import { BlockTypeEnum } from './BlockType';

export default interface BlockType {
  block_type: BlockTypeEnum;
  description: string;
  groups?: string[];
  language: string;
  name: string;
  path: string;
}
