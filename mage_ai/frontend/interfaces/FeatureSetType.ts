import ActionType from './ActionType';
import InsightsType from './InsightsType';
import MetadataType from './MetadataType';
import SuggestionType from './SuggestionType';

export default interface FeatureSetType {
  id: number;
  insights: InsightsType[];
  metadata: MetadataType;
  pipeline?: {
    id: number;
    actions: ActionType[];
  };
  sample_data?: {
    columns: string[];
    rows: string[][];
  };
  statistics: {
    [key: string]: any;
  };
  suggestions: SuggestionType[];
}
