import BlockType from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';

interface RangeType {
  endColumn: number;
  endLineNumber: number;
  startColumn: number;
  startLineNumber: number;
}

interface SuggestionType {
  documentation: string;
  insertText: string;
  kind: any;
  label: string;
  range: RangeType;
}

export interface ProvidersType {
  [language: string]: (monaco: any) => (model: any, position: {
    column: number;
    lineNumber: number;
  }) => {
    suggestions: SuggestionType[];
  };
}

export interface ProviderOptionsType {
  block: BlockType;
  blocks: BlockType[];
  pipeline: PipelineType;
}
