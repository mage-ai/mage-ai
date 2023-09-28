export const GLOBAL_VARIABLES_UUID = 'global';

export default interface PipelineVariableType {
  block: {
    uuid: string;
  };
  pipeline: {
    uuid: string;
  };
  variables: {
    uuid: string;
    value: any;
  }[];
}

export interface VariableType {
  uuid: string,
  type?: string,
  value: any,
}
