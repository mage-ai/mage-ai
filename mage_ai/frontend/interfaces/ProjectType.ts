export enum FeatureUUIDEnum {
  ADD_NEW_BLOCK_V2 = 'add_new_block_v2',
  DATA_INTEGRATION_IN_BATCH_PIPELINE = 'data_integration_in_batch_pipeline',
  INTERACTIONS = 'interactions',
  LOCAL_TIMEZONE = 'display_local_timezone',
  OPERATION_HISTORY = 'operation_history',
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
