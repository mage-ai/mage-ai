import InsightsType from './InsightsType';
import PipelineType from './PipelineType';
import SuggestionType from './SuggestionType';
import { MetadataType } from './MetadataType';

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

export interface ColumnFeatureSetType extends Omit<FeatureSetType, 'sample_data'> {
  sample_data: {
    [key: string]: string[];
  }
}
