import ActionPayloadType, { ActionStatusEnum } from './ActionPayloadType';

export default interface SuggestionType {
  action_payload: ActionPayloadType;
  message?: string;
  preview_results?: {
    removed_row_indices?: number[];
  };
  status?: ActionStatusEnum;
  title?: string;
}
