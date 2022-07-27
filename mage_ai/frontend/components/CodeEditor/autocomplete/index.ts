import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { ProviderOptionsType } from './constants';

export function variablesFromBlocks(
  monaco,
  range,
  {
    block,
    blocks,
    pipeline,
  },
) {
  return blocks.reduce((acc, {
    type,
    uuid,
  }: BlockType) => {
    if (block.uuid === uuid) {
      return acc;
    }

    return acc.concat({
      label: `df ${uuid} ${type} data`,
      kind: monaco.languages.CompletionItemKind.SNIPPET,
      documentation: 'TBD',
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
      const suggestions = [];

      // find out if we are completing a property in the 'dependencies' object.
      const textUntilPosition = model.getValueInRange({
        endColumn: position.column,
        endLineNumber: position.lineNumber,
        startColumn: 1,
        startLineNumber: 1,
      });

      // const match = textUntilPosition.match(
      //   /"dependencies"\s*:\s*\{\s*("[^"]*"\s*:\s*"[^"]*"\s*,\s*)*([^"]*)?$/
      // );
      // if (!match) {
      //   return { suggestions: [] };
      // }

      const word = model.getWordUntilPosition(position);
      const range = {
        endColumn: word.endColumn,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        startLineNumber: position.lineNumber,
      };

      if (BlockTypeEnum.SCRATCHPAD === type) {
        suggestions.push(...variablesFromBlocks(monaco, range, opts));
      }

      return {
        suggestions,
      };
    }
  };
}
