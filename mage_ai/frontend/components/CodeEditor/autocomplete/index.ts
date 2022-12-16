import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import importLibraries from './importLibraries';
import {
  ProviderOptionsType,
  RangeType,
  SuggestionType,
  WordType,
} from './constants';
import {
  getFunctionsFromCurrentClass,
  getFunctionsFromCurrentModule,
} from './functions';
import { indexBy, sortByKey } from '@utils/array';

function columnNameItems(monaco, range, block: BlockType) {
  const columns = block.outputs?.[0]?.sample_data?.columns || [];
  return columns.map((column: string) => ({
    label: `${column} column`,
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: `'${column}'`,
    range,
  }));
}

function variableManagersDefinedRegex(blocks, pipeline) {
  return blocks.map((block: BlockType) => {
    const regex = new RegExp(
      `([\\w_]+)[ ]*=[ ]*get_variable\\('${pipeline.uuid}', '${block.uuid}', 'output_0'\\)`,
      'g',
    );

    return {
      block,
      regex,
    };
  });
}

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
      label: `df ${uuid} ${type} block`,
      // https://docs.microsoft.com/en-us/dotnet/api/microsoft.visualstudio.languageserver.protocol.completionitemkind?view=visualstudiosdk-2022
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: `Get the data from ${type} block ${uuid}.`,
      insertText: `from mage_ai.data_preparation.variable_manager import get_variable


df = get_variable('${pipeline.uuid}', '${uuid}', 'output_0')
`,
      range,
    });
  }, []);
}

function variablesFromPositionalArguments(monaco, range, {
  block,
  blocks,
}): SuggestionType[] {
  const {
    upstream_blocks: upstreamBlocks,
  } = block;
  const blocksMapping = indexBy(blocks, ({ uuid }) => uuid);

  return upstreamBlocks.map((uuid: string, idx: number) => {
    const upstreamBlock = blocksMapping[uuid];
    const {
      type,
    } = upstreamBlock;
    const insertText = idx === 0 ? 'output_0' : `args[${idx - 1}]`;

    return {
      label: `df ${uuid} ${type} block`,
      kind: monaco.languages.CompletionItemKind.Variable,
      documentation: `Variable for ${type} ${uuid} data.`,
      insertText,
      range,
    };
  });
}

export default function(opts: ProviderOptionsType) {
  const {
    autocompleteItems,
    block,
    blocks,
    pipeline,
  } = opts;
  const {
    type,
    upstream_blocks: upstreamBlocks,
  } = block;
  const autocompleteItemsById = indexBy(autocompleteItems, ({ id }) => id);

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

      // methods from imported class
      const methodsForClass =
        getFunctionsFromCurrentClass(textUntilPosition, range, autocompleteItemsById);

      if (methodsForClass?.length >= 1) {
        const arr = methodsForClass.map(methodName => ({
          filterText: methodName,
          insertText: methodName,
          kind: monaco.languages.CompletionItemKind.Method,
          label: methodName,
          range,
        }));
        const arrFiltered = filter(word, arr);

        if (arrFiltered.length >= 1) {
          return {
            suggestions: arrFiltered,
          };
        }
      }

      // function from imported module
      const functionsForModule =
        getFunctionsFromCurrentModule(textUntilPosition, range, autocompleteItemsById);

      if (functionsForModule?.length >= 1) {
        const arr = functionsForModule.map(methodName => ({
          filterText: methodName,
          insertText: methodName,
          kind: monaco.languages.CompletionItemKind.Function,
          label: methodName,
          range,
        }));
        const arrFiltered = filter(word, arr);

        if (arrFiltered.length >= 1) {
          return {
            suggestions: arrFiltered,
          };
        }
      }

      // Positional argument variable names (e.g. df_1, df_2, etc)
      if (upstreamBlocks?.length >= 1) {
        const re = new RegExp(`\n@${type}`);
        const match = textUntilPosition.match(re);

        if (match) {
          suggestions.push(...filter(word, variablesFromPositionalArguments(monaco, range, opts)));
        }
      }

      // Autocomplete import of Mage specific libraries
      // from and import statements from data loaders, data exporters, transformers

      if (word.word.match(/i|f/)) {
        const arr = importLibraries(
          autocompleteItems,
          textUntilPosition,
          word,
          monaco,
          range,
          opts,
        );
        suggestions.push(...arr);
      }

      // Variables defined in other blocks (e.g. the code copied from variables tab)
      // Upstream block input value dataframe variables
      if (BlockTypeEnum.CHART === type || BlockTypeEnum.SCRATCHPAD === type) {
        // Search all previous lines where [var] = get_variable(pipeline_uuid, block_uuid, 'output_0')
        // is defined, then get the value of [var] and check to see if they typed it on the
        // same line as the current word.

        const variableNamesMatched = [];

        if (BlockTypeEnum.CHART === type) {
          upstreamBlocks.forEach((blockUUID: string, idx: number) => {
            variableNamesMatched.push({
              block: blocks.find(({ uuid }) => blockUUID === uuid),
              matchIndex: 0,
              variableName: `df_${idx + 1}`,
            });
          });
        } else if (BlockTypeEnum.SCRATCHPAD === type) {
          variableManagersDefinedRegex(blocks, pipeline).forEach(({
            block: blockForRegex,
            regex,
          }) => {
            const matches = textUntilPosition.matchAll(regex);
            // @ts-ignore
            [...matches].forEach((match) => {
              const matchIndex = match?.index;
              const variableName = match?.[1];
              if (variableName) {
                variableNamesMatched.push({
                  block: blockForRegex,
                  matchIndex,
                  variableName,
                });
              }
            });
          });
        }

        if (variableNamesMatched.length >= 1) {
          const textPreviouslyTypeInSameLine =
            textUntilPosition.split('\n')[position.lineNumber - 1]?.slice(0, word.startColumn - 1);

          if (textPreviouslyTypeInSameLine) {
            const arrayOfItems = [];

            variableNamesMatched.forEach(({
              block: blockForVariable,
              matchIndex,
              variableName,
            }) => {
              const regex = new RegExp(`${variableName}\\[`);
              if (textPreviouslyTypeInSameLine.match(regex)) {
                arrayOfItems.push({
                  items: columnNameItems(monaco, range, blockForVariable),
                  matchIndex,
                });
              }
            });

            if (arrayOfItems.length >= 1) {
              const mostRecentMatchItems =
                sortByKey(arrayOfItems, 'matchIndex', { ascending: false })[0];

              return {
                suggestions: filter(word, mostRecentMatchItems.items),
              }
            }
          }
        }

        if (startColumn === 1) {
          if (BlockTypeEnum.CHART === type) {
            suggestions.push(...filter(
              word,
              upstreamBlocks.map((blockUUID, idx: number) => {
                const varName = `df_${idx + 1}`;

                return {
                  label: `${varName} ${blockUUID} block`,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: varName,
                  range,
                };
              }),
            ));
          } else if (BlockTypeEnum.SCRATCHPAD === type) {
            suggestions.push(...filter(word, variablesFromBlocks(monaco, range, opts)));
          }
        }
      }

      // Variables defined in current block
      const allWordsFromAllBlockContent = new Set();
      blocks.concat({ content: textUntilPosition }).forEach(({ content }) => {
        // Words from other blocks
        // @ts-ignore
        [...content.matchAll('([A-Za-z_0-9]+)', 'g')]
          .forEach(word => allWordsFromAllBlockContent.add(word[1]));
      });
      // @ts-ignore
      const wordsFromContent = [...allWordsFromAllBlockContent];

      if (wordsFromContent.length) {
        const arr = wordsFromContent.map(wordFromContent => ({
          filterText: wordFromContent,
          insertText: wordFromContent,
          kind: monaco.languages.CompletionItemKind.Variable,
          label: wordFromContent,
          range,
        }));
        // @ts-ignore
        suggestions.push(...filter(word, arr));
      }

      return {
        // https://github.com/microsoft/monaco-editor/issues/1889#issuecomment-607479373
        suggestions,
      };
    }
  };
}
