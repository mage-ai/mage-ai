export function addAutocompleteSuggestions(monaco, autocompleteProviders) {
  return Object.entries(autocompleteProviders).map(([lang, buildProvider]) => {
    // https://microsoft.github.io/monaco-editor/api/modules/monaco.languages.html#registerCompletionItemProvider

    return monaco.languages.registerCompletionItemProvider(lang, {
      // @ts-ignore
      provideCompletionItems: buildProvider(monaco),
    });
  });
}
