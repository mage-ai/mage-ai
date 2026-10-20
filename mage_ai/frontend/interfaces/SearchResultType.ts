import BlockActionObjectType from './BlockActionObjectType';

export enum SearchResultTypeEnum {
  BLOCK_ACTION_OBJECTS = 'block_action_objects',
}

export default interface SearchResultType {
  results: BlockActionObjectType[];
  type: SearchResultTypeEnum;
  uuid: string;
}
