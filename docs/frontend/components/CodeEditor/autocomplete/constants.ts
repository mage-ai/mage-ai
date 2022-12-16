import AutocompleteItemType from '@interfaces/AutocompleteItemType';
import BlockType from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';

export interface RangeType {
  endColumn: number;
  endLineNumber: number;
  startColumn: number;
  startLineNumber: number;
}

export interface WordType {
  endColumn: number;
  startColumn: number;
  word: string;
};

export interface SuggestionType {
  documentation?: string;
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
  autocompleteItems: AutocompleteItemType[];
  block: BlockType;
  blocks: BlockType[];
  pipeline: PipelineType;
}
