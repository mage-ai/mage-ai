import test from './test.json';
import { LibraryImportType } from './constants';

export default function(textUntilPosition, wordObj, monaco, range, opts) {
  const {
    word,
  } = wordObj;

  const mapping = Object.entries(test).reduce((acc, [k, v]) => {
    let moduleName = k;
    if (moduleName.match(/__init__.py/)) {
      moduleName = moduleName.replace(/\/__init__.py/, '');
    }
    moduleName = moduleName.split('.py')[0].replaceAll('/', '.');

    return {
      ...acc,
      [moduleName]: {
        ...v,
      },
    };
  }, {});

  const isImport = word === 'i';
  const isFrom = word === 'f';
  const prefix = isImport ? 'import' : isFrom ? 'from' : '';

  const textBeforeWord = textUntilPosition
    .split('\n')[range.startLineNumber - 1]
    .slice(0, range.startColumn - 1);

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
    }: LibraryImportType = mapping[parentModuleName];

    const items = [];

    [
      [constants, monaco.languages.CompletionItemKind.Constant],
      [classes, monaco.languages.CompletionItemKind.Class],
      [functions, monaco.languages.CompletionItemKind.Function],
    ].forEach(([arr, kind]) => {
      arr.forEach((objName: string) => {
         items.push({
          insertText: `import ${objName}`,
          kind,
          label: `import ${objName}`,
          range,
         })
      });
    });

    files.forEach((fileName: string) => {
      const p = fileName.split('/');
      const childModuleName = p[p.length - 1].split('.py')[0];

      items.push({
        insertText: `import ${childModuleName}`,
        kind: monaco.languages.CompletionItemKind.Variable,
        label: `import ${childModuleName}`,
        range,
      });
    });

    return items;
  }

  return Object.entries(mapping).map(([k, v]) => {
    // @ts-ignore
    const {
      classes: classesArr,
      constants: constantsArr,
      files: filesArr,
      functions: functionsArr,
    }: LibraryImportType = v;

    return {
      // filterText: `import ${k}`,
      insertText: `${prefix} ${k}`,
      kind: monaco.languages.CompletionItemKind.Class,
      label: `${prefix} ${k}`,
      range: {
        ...range,
        // startColumn: range.endColumn,
      },
    };
  });
}
