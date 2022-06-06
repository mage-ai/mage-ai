import InsightsType from './InsightsType';
import MetadataType from './MetadataType';
import PipelineType from './PipelineType';
import SuggestionType from './SuggestionType';

export default interface FeatureSetType {
  id: string | number;
  insights: InsightsType[][];
  metadata: MetadataType;
  pipeline?: PipelineType;
  sample_data?: {
    columns: string[];
    rows: string[][];
  };
  statistics: {
    [key: string]: any;
  };
  suggestions: SuggestionType[];
}
