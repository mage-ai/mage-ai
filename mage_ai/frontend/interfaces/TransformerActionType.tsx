import ActionPayloadType from './ActionPayloadType';

export default interface TransformerActionType {
  action_payload: ActionPayloadType;
  message: string;
  title: string;
}
