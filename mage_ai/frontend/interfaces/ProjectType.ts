export enum FeatureUUIDEnum {
  ADD_NEW_BLOCK_V2 = 'add_new_block_v2',
  COMPUTE_MANAGEMENT = 'compute_management',
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

export interface EmrConfigType {

}

export interface SparkConfigType {
  app_name?: string;
  custom_session_var_name?: string;
  executor_env?: {
    PYTHONPATH?: string;
    [key: string]: string;
  };
  others?: {
    [key: string]: string;
  }
  spark_home?: string;
  spark_jars?: string[];
  spark_master?: string;
  use_custom_session?: boolean;
}

export default interface ProjectType {
  emr_config?: EmrConfigType;
  features?: {
    [key: string]: boolean;
  };
  help_improve_mage?: boolean;
  latest_version: string;
  name: string;
  openai_api_key?: string;
  project_uuid?: string;
  spark_config: SparkConfigType;
  version: string;
}
