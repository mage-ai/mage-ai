import configuration from './configuration';
import provider from './provider';

export const language: 'python' = 'python';

export default function setup(monaco: typeof import('monaco-editor')) {
  monaco.languages.setLanguageConfiguration(language, configuration());
  // @ts-ignore
  monaco.languages.setMonarchTokensProvider(language, provider());
}
