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
  // variables: string[];
}

export interface VariableType {
  uuid: string,
  type: string,
  value: string,
}
