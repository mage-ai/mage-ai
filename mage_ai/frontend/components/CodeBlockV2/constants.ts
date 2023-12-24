import BlockType from '@interfaces/BlockType';
import StatusType from '@interfaces/StatusType';
import { ThemeType } from '@oracle/styles/themes/constants';

export interface UseCodeBlockPropsType {
  header: CodeBlockHeaderProps;
}

export type UseCodeBlockComponentProps = {
  block: BlockType;
  selected?: boolean;
  status: StatusType;
  theme: ThemeType;
};

export type CodeBlockHeaderProps = {
  subtitle?: string;
  title: string;
} & UseCodeBlockComponentProps;

export interface UseCodeBlockComponentType {
  editor: any;
  extraDetails: any;
  footer: any;
  header: any;
  headerTabs: any;
  output: any;
  outputTabs: any;
  tags: any;
}
