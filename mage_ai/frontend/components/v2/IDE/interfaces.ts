import { ExecutionResultType } from '@interfaces/EventStreamType';
import { LanguageEnum } from './languages/constants';

export type IDEProps = {
  containerClassName?: string;
  configurations?: any;
  editorActions?: any[];
  editorClassName?: string;
  eventListeners?: any;
  onMountEditor?: (editor: any) => void;
  persistManagerOnUnmount?: boolean;
  persistResourceOnUnmount?: boolean;
  style?: React.CSSProperties;
  theme?: any;
};

export interface CodeResources {
  main: {
    language: LanguageEnum;
    text: string;
    uri: string;
  };
  original?: {
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
  output?: ExecutionResultType[];
  path: string;
  relative_path?: string;
  size: number;
}

export interface ResourceType {
  main: FileType;
  original?: FileType;
}
