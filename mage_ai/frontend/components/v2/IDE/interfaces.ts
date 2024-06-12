import { LanguageEnum } from './languages/constants';

export interface FileType {
  language?: LanguageEnum;
  content: string;
  uri: string;
}
