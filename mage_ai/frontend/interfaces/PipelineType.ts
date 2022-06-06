import TransformerActionType from './TransformerActionType';

export default interface PipelineType {
  id: number;
  actions: TransformerActionType[];
}
