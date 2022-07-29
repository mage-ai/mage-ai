import AutocompleteItemType from '@interfaces/AutocompleteItemType';

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

  const mapping = autocompleteItems.reduce((acc, autocompleteItem) => {
    let moduleName = autocompleteItem.id;
    if (moduleName.match(/__init__.py/)) {
      moduleName = moduleName.replace(/\/__init__.py/, '');
    }
    moduleName = moduleName.split('.py')[0].replaceAll('/', '.');

    return {
      ...acc,
      [moduleName]: {
        ...autocompleteItem,
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
      const p = fileName.split('/');
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

  return Object.entries(mapping).map(([k, v]) => {
    // @ts-ignore
    const {
      classes: classesArr,
      constants: constantsArr,
      files: filesArr,
      functions: functionsArr,
    }: AutocompleteItemType = v;

    return {
      filterText: `${prefix} ${k}`,
      insertText: `${prefix} ${k} `,
      kind: monaco.languages.CompletionItemKind.Class,
      label: `${k}`,
      range: {
        ...range,
        // startColumn: range.endColumn,
      },
    };
  });
}
