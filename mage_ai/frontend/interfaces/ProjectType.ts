import { PipelineSettingsType } from './PipelineType';

export enum FeatureUUIDEnum {
  ADD_NEW_BLOCK_V2 = 'add_new_block_v2',
  COMPUTE_MANAGEMENT = 'compute_management',
  DATA_INTEGRATION_IN_BATCH_PIPELINE = 'data_integration_in_batch_pipeline',
  INTERACTIONS = 'interactions',
  NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW = 'notebook_block_output_split_view',
  LOCAL_TIMEZONE = 'display_local_timezone',
  OPERATION_HISTORY = 'operation_history',
}

export enum ProjectTypeEnum {
  MAIN = 'main',
  STANDALONE = 'standalone',
  SUB = 'sub',
}

export interface EMRConfigType {
  bootstrap_script_path?: string;
  ec2_key_name?: string;
  ec2_key_path?: string;
  master_instance_type?: string;
  master_security_group?: string;
  master_spark_properties?: {
    [key: string]: boolean | number | string;
  };
  slave_instance_count?: number;
  slave_instance_type?: string;
  slave_security_group?: string;
  slave_spark_properties?: {
    [key: string]: boolean | number | string;
  };
}

export interface SparkConfigType {
  app_name?: string;
  custom_session_var_name?: string;
  executor_env?: {
    PYTHONPATH?: string;
    [key: string]: boolean | number | string;
  };
  others?: {
    [key: string]: boolean | number | string;
  }
  spark_home?: string;
  spark_jars?: string[];
  spark_master?: string;
  use_custom_session?: boolean;
}

interface ProjectPipelinesType {
  settings?: PipelineSettingsType;
}

export default interface ProjectType {
  emr_config?: EMRConfigType;
  features?: {
    [key: string]: boolean;
  };
  help_improve_mage?: boolean;
  latest_version?: string;
  name?: string;
  openai_api_key?: string;
  pipelines?: ProjectPipelinesType;
  project_uuid?: string;
  remote_variables_dir?: string;
  spark_config?: SparkConfigType;
  version?: string;
}
