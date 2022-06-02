import ActionPayloadType from './ActionPayloadType';

export default interface SuggestionType {
  action_payload: ActionPayloadType;
  message: string;
  status: string;
  title: string;
}
