export function addAutocompleteSuggestions(monaco, autocompleteProviders) {
  return Object.entries(autocompleteProviders).map(([lang, buildProvider]) => {
    // https://microsoft.github.io/monaco-editor/api/modules/monaco.languages.html#registerCompletionItemProvider

    // const langs = monaco.languages.getLanguages();
    // const python = langs.find(({ id }) => id == 'python');
    // console.log(monaco);

    return monaco.languages.registerCompletionItemProvider(lang, {
      // @ts-ignore
      provideCompletionItems: buildProvider(monaco),
    });
  });
}
