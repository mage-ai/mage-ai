export default interface PipelineVariableType {
  block: {
    uuid: string;
  };
  pipeline: {
    uuid: string;
  };
  variables: string[];
}
