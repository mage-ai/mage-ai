import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import {
  ProviderOptionsType,
  RangeType,
  SuggestionType,
  WordType,
} from './constants';

function filter(word: WordType, suggestions: SuggestionType[]): SuggestionType[] {
  const letters = word.word.split('');

  const re = new RegExp(letters.reduce((acc, letter, idx) => {
    const nextLetter = letters[idx + 1];
    const nextLetterRegex = nextLetter
      ? `^${nextLetter}`
      : '';
    return acc + `${letter}[\w ${nextLetterRegex}]*`;
  }, ''));

  return suggestions.reduce((acc, suggestion: SuggestionType) => {
    const { label } = suggestion;

    if (label.match(re)) {
      return acc.concat(suggestion);
    }

    return acc;
  }, []);
}

function variablesFromBlocks(
  monaco,
  range,
  {
    block,
    blocks,
    pipeline,
  },
): SuggestionType[] {
  return blocks.reduce((acc, {
    type,
    uuid,
  }: BlockType) => {
    if (block.uuid === uuid || ![
      BlockTypeEnum.DATA_LOADER,
      BlockTypeEnum.TRANSFORMER,
    ].includes(type)) {
      return acc;
    }

    return acc.concat({
      label: `df ${uuid} ${type}`,
      // https://docs.microsoft.com/en-us/dotnet/api/microsoft.visualstudio.languageserver.protocol.completionitemkind?view=visualstudiosdk-2022
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: `Get the data from ${type} block ${uuid}.`,
      insertText: `from mage_ai.data_preparation.variable_manager import get_variable


df = get_variable('${pipeline.uuid}', '${uuid}', 'df')
`,
      range,
    });
  }, []);
}

export default function(opts: ProviderOptionsType) {
  const {
    block,
    blocks,
    pipeline,
  } = opts;
  const {
    type,
    upstream_blocks: upstreamBlocks,
  } = block;

  return (monaco) => {
    return (model, position) => {
      const empty = { suggestions: [] };
      const suggestions = [];

      const textUntilPosition: string = model.getValueInRange({
        endColumn: position.column,
        endLineNumber: position.lineNumber,
        startColumn: 1,
        startLineNumber: 1,
      });

      const word: WordType = model.getWordUntilPosition(position);
      const {
        endColumn,
        startColumn,
      } = word;

      const range: RangeType = {
        endColumn,
        endLineNumber: position.lineNumber,
        startColumn,
        startLineNumber: position.lineNumber,
      };

      if (upstreamBlocks?.length >= 1) {
        // 1. Writing inside a function definition with the correct decorator
      }

      if (BlockTypeEnum.SCRATCHPAD === type) {
        if (startColumn === 1) {
          const arr = variablesFromBlocks(monaco, range, opts);
          suggestions.push(...filter(word, arr));
        }
      }

      return {
        suggestions,
      };
    }
  };
}
