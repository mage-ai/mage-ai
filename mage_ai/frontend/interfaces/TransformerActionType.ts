import ActionPayloadType from './ActionPayloadType';

export default interface TransformerActionType {
  action_payload: ActionPayloadType;
  id?: number;
  message?: string;
  title?: string;
}
