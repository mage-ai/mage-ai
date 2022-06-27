import ActionPayloadType, { ActionStatusEnum } from './ActionPayloadType';

export default interface SuggestionType {
  action_payload: ActionPayloadType;
  message?: string;
  status?: ActionStatusEnum;
  preview_results?: {
    removed_row_indices?: number[];
  };
  title?: string;
}
