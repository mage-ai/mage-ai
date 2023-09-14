export enum FeatureUUIDEnum {
  ADD_NEW_BLOCK_V2 = 'add_new_block_v2',
  LOCAL_TIMEZONE = 'display_local_timezone',
}

export enum ProjectTypeEnum {
  MAIN = 'main',
  STANDALONE = 'standalone',
  SUB = 'sub',
}

export default interface ProjectType {
  features?: {
    [key: string]: boolean;
  };
  help_improve_mage?: boolean;
  latest_version: string;
  name: string;
  openai_api_key?: string;
  project_uuid?: string;
  version: string;
}
