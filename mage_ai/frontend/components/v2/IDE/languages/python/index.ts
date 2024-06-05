import configuration from './configuration';
import provider from './provider';
import { LanguageEnum } from '../constants';

export default function setup(monaco: typeof import('monaco-editor')) {
  monaco.languages.setLanguageConfiguration(LanguageEnum.PYTHON, configuration());
  // @ts-ignore
  monaco.languages.setMonarchTokensProvider(LanguageEnum.PYTHON, provider());
}
