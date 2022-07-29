import {
  extractAllImportNames,
  extractAllImports,
  extractModuleNameImported,
  getAllVariableAssignments,
  getTextBeforeCurrentWord,
} from './utils';
import { range } from '@utils/array';

function getAutocompleteItemWithModuleParts(modulePartsInit: string[], autocompleteItemsById) {
  const moduleParts = modulePartsInit;
  if (!moduleParts.includes('__init__')) {
    moduleParts.push('__init__');
  }
  const count = moduleParts.length;

  let autocompleteItem;
  range(count).forEach((_, idx: number) => {
    if (autocompleteItem) {
      return autocompleteItem;
    }

    const idToTry = moduleParts.slice(0, count - idx).join('/');
    autocompleteItem = autocompleteItemsById[`${idToTry}.py`];
  });

  return autocompleteItem;
}

export function getFunctionsFromCurrentModule(
  textUntilPosition,
  range,
  autocompleteItemsById,
) {
  const allVariableAssignments = getAllVariableAssignments(textUntilPosition);
  const previousWord = getTextBeforeCurrentWord(textUntilPosition, range);
  const variableAssignment =
    allVariableAssignments.find(({ variableName }) => previousWord.match(new RegExp(variableName)));

  if (variableAssignment) {
    const { assignmentValue } = variableAssignment;
    const importMatch = extractAllImportNames(textUntilPosition)[assignmentValue];
    const moduleParts = importMatch.split('as')[0].replace('from', '').replace('import', '').split(' ').reduce((acc, word) => {
      if (!word.trim()) {
        return acc;
      }

      return acc.concat(word);
    }, []);

    const autocompleteItem = getAutocompleteItemWithModuleParts(
      moduleParts.join('.').split('.'),
      autocompleteItemsById,
    );
    const moduleNameImported = extractModuleNameImported(importMatch, assignmentValue);
    const methodsForClass = autocompleteItem?.methods_for_class?.[moduleNameImported];

    return methodsForClass;
  }

  return [];
}
