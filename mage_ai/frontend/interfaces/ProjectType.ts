import PlatformType from './PlatformType';
import { PipelineSettingsType } from './PipelineType';

export enum FeatureUUIDEnum {
  ADD_NEW_BLOCK_V2 = 'add_new_block_v2',
  CODE_BLOCK_V2 = 'code_block_v2',
  COMMAND_CENTER = 'command_center',
  COMPUTE_MANAGEMENT = 'compute_management',
  CUSTOM_DESIGN = 'custom_design',
  DATA_INTEGRATION_IN_BATCH_PIPELINE = 'data_integration_in_batch_pipeline',
  DBT_V2 = 'dbt_v2',
  GLOBAL_HOOKS = 'global_hooks',
  INTERACTIONS = 'interactions',
  NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW = 'notebook_block_output_split_view',
  LOCAL_TIMEZONE = 'display_local_timezone',
  OPERATION_HISTORY = 'operation_history',
}

export enum ProjectTypeEnum {
  DBT = 'dbt',
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
  spark_jars?: string[];
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

interface LifecycleConfigType {
  termination_policy?: {
    enable_auto_termination?: boolean;
    max_idle_seconds?: number;
  };
  pre_start_script_path?: string;
  post_start?: {
    command?: string[];
    hook_path?: string;
  };
}

export interface WorkspaceConfigType {
  name?: string;
  lifecycle_config?: LifecycleConfigType;
  k8s?: {
    namespace: string;
    ingress_name: string;
    service_acount_name: string;
    storage_access_mode: string;
    storage_class_name: string;
    storage_request_size: string;
  };
}

export interface ProjectPipelinesType {
  settings?: PipelineSettingsType;
}

export default interface ProjectType {
  emr_config?: EMRConfigType;
  features?: {
    [key: string]: boolean;
  };
  features_defined?: {
    [key: string]: boolean;
  };
  features_override?: {
    [key: string]: boolean;
  };
  help_improve_mage?: boolean;
  latest_version?: string;
  name?: string;
  openai_api_key?: string;
  pipelines?: ProjectPipelinesType;
  platform_settings?: PlatformType;
  project_uuid?: string;
  projects?: {
    [name: string]: string;
  };
  remote_variables_dir?: string;
  repo_path: string;
  root_project?: boolean;
  settings?: {
    active: boolean;
    path: string;
    uuid: string;
  }
  spark_config?: SparkConfigType;
  version?: string;
  workspace_config_defaults?: WorkspaceConfigType;
}
