export function addAutocompleteSuggestions(monaco, autocompleteProviders) {
  return Object.entries(autocompleteProviders).map(([lang, buildProvider]) => {
    // https://microsoft.github.io/monaco-editor/api/modules/monaco.languages.html#registerCompletionItemProvider

    return monaco.languages.registerCompletionItemProvider(lang, {
      // @ts-ignore
      provideCompletionItems: buildProvider(monaco),
    });
  });
}

export function extractAllImports(textUntilPosition) {
  const regexBase = '[\\w.]+';
  const regexes = [
    `import ${regexBase} as ${regexBase}`,
    `import ${regexBase}`,
    `from ${regexBase} import ${regexBase} as ${regexBase}`,
    `from ${regexBase} import ${regexBase}`,
  ];
  const regex = new RegExp(`(${regexes.join('|')})`, 'g');

  return [...textUntilPosition.matchAll(regex)].map(group => group[1]);
}

export function extractAllImportNames(textUntilPosition) {
  const allImports = extractAllImports(textUntilPosition);
  const regexBase = '[\\w.]+';
  const regexes = [
    `from ${regexBase} import ${regexBase} as (${regexBase})`,
    `from ${regexBase} import (${regexBase})`,
    `import ${regexBase} as (${regexBase})`,
    `import (${regexBase})`,
  ];

  const regex = new RegExp(`(${regexes.join('|')})`);

  return allImports.reduce((acc, importStatement: string) => {
    const match = importStatement.match(regex);

    if (!match) {
      return acc;
    }

    const [,, m2, m3, m4, m5] = [...match];
    const key = m2 || m3 || m4 || m5;

    return {
      ...acc,
      [key]: importStatement,
    }
  }, {});
}

export function extractModuleNameImported(importStatementInit, asName) {
  let importStatement = importStatementInit;
  if (asName) {
    importStatement = importStatement.split(` as ${asName}`)[0];
  }
  const regexBase = '[\\w.]+';
  const regexes = [
    `from ${regexBase} import (${regexBase})`,
    `import (${regexBase})`,
  ];
  const regex = new RegExp(`(${regexes.join('|')})`, 'g');

  const match = [...importStatement.matchAll(regex)][0];
  if (!match) {
    return;
  }

  const [,, m2, m3] = match;

  return m2 || m3;
}

export function getCurrentLine(textUntilPosition, range) {
  return textUntilPosition.split('\n')[range.startLineNumber - 1];
}

export function getTextBeforeCurrentWord(textUntilPosition, range) {
  return getCurrentLine(textUntilPosition, range).slice(0, range.startColumn - 1);
}

export function getAllVariableAssignments(textUntilPosition) {
  const regex = new RegExp(
    `([\\w_]+)[ ]*=[ ]*([\\w_]+)`,
    'g',
  );

  return [...textUntilPosition.matchAll(regex)].map(group => ({
    assignmentValue: group[2],
    variableName: group[1],
  }));
}
