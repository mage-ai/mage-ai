export type ConfigurationType = {
  metadata?: {
    required?: boolean;
  };
} & any;

export type FrameworkType = (any & any) & {
  downstream_blocks?: any[];
  children?: any[];
  upstream_blocks?: any[];
};

export type PipelineExecutionFrameworkBlockType = any & {
  blocks: any[];
  configuration?: any;
  name?: string;
  downstream_blocks?: any[];
  groups?: any[];
  type?: any;
  upstream_blocks?: any[];
  uuid: any;
};

type PipelineExecutionFrameworkType = {
  blocks: any[];
  execution_framework?: any;
  groups?: any[];
  pipelines?: any[];
  name?: string;
  type: any;
  uuid: any;
};

export default PipelineExecutionFrameworkType;
