import * as osPath from 'path';
import AutocompleteItemType, { GroupEnum } from '@interfaces/AutocompleteItemType';
import { getTextBeforeCurrentWord } from './utils';

export default function(
  autocompleteItems = [],
  textUntilPosition,
  wordObj,
  monaco,
  range,
  opts,
) {
  const {
    word,
  } = wordObj;

  const allImportExamples = new Set();
  const mapping = {};

  autocompleteItems.forEach((autocompleteItem) => {
    const {
      group,
      id,
      imports,
    } = autocompleteItem;

    if ([GroupEnum.MAGE_LIBRARY, GroupEnum.USER_LIBRARY].includes(group)) {
      let moduleName = id;
      if (moduleName.match(/__init__.py/)) {
        moduleName = moduleName.replace(/\/__init__.py/, '');
      }
      moduleName = moduleName.split('.py')[0].replaceAll(osPath.sep, '.');

      mapping[moduleName] = autocompleteItem;
    }

    // import/from for all files
    const parts = id.replace('.py', '').replace('/__init__', '').split(osPath.sep);
    if (parts.length === 1) {
      allImportExamples.add(`import ${parts[0]}`);
    } else if (parts.length >= 2) {
      const fromStatement = parts.slice(0, parts.length - 1).join('.');
      allImportExamples.add(`from ${fromStatement} import ${parts[parts.length - 1]}`);
    }

    imports.forEach(line => allImportExamples.add(line));
  });

  const isImport = word === 'i';
  const isFrom = word === 'f';
  const prefix = isImport ? 'import' : isFrom ? 'from' : '';

  const textBeforeWord = getTextBeforeCurrentWord(textUntilPosition, range);

  let parentModuleName;
  if (isImport && textBeforeWord.match(/from/)) {
    parentModuleName = textBeforeWord.match(/from ([A-Za-z0-9_.]+) /)[1];
  }

  if (parentModuleName && mapping[parentModuleName]) {
    const {
      classes,
      constants,
      files,
      functions,
    }: AutocompleteItemType = mapping[parentModuleName];

    const items = [];

    [
      [constants, monaco.languages.CompletionItemKind.Constant],
      [classes, monaco.languages.CompletionItemKind.Class],
      [functions, monaco.languages.CompletionItemKind.Function],
    ].forEach(([arr, kind]) => {
      arr.forEach((objName: string) => {
         items.push({
          filterText: `import ${objName}`,
          insertText: `import ${objName}`,
          kind,
          label: objName,
          range,
         })
      });
    });

    files.forEach((fileName: string) => {
      const p = fileName.split(osPath.sep);
      const childModuleName = p[p.length - 1].split('.py')[0];

      items.push({
        filterText: `import ${childModuleName}`,
        insertText: `import ${childModuleName}`,
        kind: monaco.languages.CompletionItemKind.Variable,
        label: childModuleName,
        range,
      });
    });

    return items;
  }

  // @ts-ignore
  return [...allImportExamples].map(line => ({
    filterText: line,
    insertText: line,
    kind: monaco.languages.CompletionItemKind.File,
    label: line,
    range,
  })).concat(Object.entries(mapping).map(([k, v]) => {
    return {
      filterText: `${prefix} ${k}`,
      insertText: `${prefix} ${k} `,
      kind: monaco.languages.CompletionItemKind.File,
      label: `${k}`,
      range: {
        ...range,
        // startColumn: range.endColumn,
      },
    };
  }));
}
