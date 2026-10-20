import * as osPath from 'path';
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

    const idToTry = moduleParts.slice(0, count - idx).join(osPath.sep);
    autocompleteItem = autocompleteItemsById[`${idToTry}.py`];
  });

  return autocompleteItem;
}

export function getFunctionsFromCurrentClass(
  textUntilPosition,
  range,
  autocompleteItemsById,
) {
  // NOTE: this doesn’t handle cases where the user imports a module then accesses
  // the class from that module. For example: from foo import bar; then bar.CoolClass()
  // Only currently works if they do from foo.bar import CoolClass
  const allVariableAssignments = getAllVariableAssignments(textUntilPosition);
  const previousWord = getTextBeforeCurrentWord(textUntilPosition, range);
  const variableAssignment =
    allVariableAssignments.find(({ variableName }) => previousWord.match(new RegExp(variableName)));

  if (variableAssignment) {
    const { assignmentValue } = variableAssignment;
    const importMatch = extractAllImportNames(textUntilPosition)[assignmentValue];

    if (importMatch) {
      const moduleParts = importMatch.split(' as ')[0].replace('from ', '').replace('import ', '').split(' ').reduce((acc, word) => {
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
  }

  return [];
}

export function getFunctionsFromCurrentModule(
  textUntilPosition,
  range,
  autocompleteItemsById,
) {
  let previousWord = getTextBeforeCurrentWord(textUntilPosition, range);
  previousWord = previousWord.match(/([\w_]+)./);

  if (previousWord) {
    const importMatch = extractAllImportNames(textUntilPosition)[previousWord[1]];

    if (importMatch) {
      const moduleParts = importMatch.split(' as ')[0].replace('from ', '').replace('import ', '').split(' ').reduce((acc, word) => {
        if (!word.trim()) {
          return acc;
        }

        return acc.concat(word);
      }, []);

      const autocompleteItem = getAutocompleteItemWithModuleParts(
        moduleParts.join('.').split('.'),
        autocompleteItemsById,
      );

      if (autocompleteItem?.functions) {
        return autocompleteItem?.functions;
      }
    }
  }

  return [];
}
