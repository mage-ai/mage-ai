import { LanguageEnum } from './languages/constants';

export interface CodeResources {
  main: {
    language: LanguageEnum;
    text: string;
    uri: string;
  };
}

export interface FileType {
  content?: string;
  extension?: string;
  language?: LanguageEnum;
  modified_timestamp?: number;
  name: string;
  path: string;
  relative_path?: string;
  size: number;
}
