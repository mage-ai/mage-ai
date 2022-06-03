import ActionPayloadType, { ActionStatusEnum } from './ActionPayloadType';

export default interface SuggestionType {
  action_payload: ActionPayloadType;
  message: string;
  status: ActionStatusEnum;
  title: string;
}
