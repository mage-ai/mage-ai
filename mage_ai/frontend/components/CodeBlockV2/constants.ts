import BlockType from '@interfaces/BlockType';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import StatusType from '@interfaces/StatusType';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { KeyTextsPostitionEnum } from '@oracle/elements/Button/KeyboardShortcutButton';
import { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import { ThemeType } from '@oracle/styles/themes/constants';

export enum ButtonUUIDEnum {
  EXECUTE = 'execute',
  EXECUTE_CANCEL = 'execute_cancel',
}

export type RunBlockAndTrackProps = {
  block: BlockType;
  code?: string;
  disableReset?: boolean;
  runDownstream?: boolean;
  runIncompleteUpstream?: boolean;
  runSettings?: {
    run_model?: boolean;
  };
  runUpstream?: boolean;
  runTests?: boolean;
  syncColumnPositions?: {
    rect: {
      height: number;
      y: number;
    };
    y: number;
  };
  variables?: {
    [key: string]: any;
  };
};

export type UseCodeBlockComponentProps = {
  block: BlockType;
  executionState: ExecutionStateEnum;
  interruptKernel: () => void;
  runBlockAndTrack: (payload?: RunBlockAndTrackProps) => void;
  selected?: boolean;
  status: StatusType;
  theme: ThemeType;
};

export type ButtonType = {
  Icon?: any;
  color?: string;
  description?: string;
  disabled?: boolean;
  icon?: any;
  keyTextGroups?: NumberOrString[][];
  keyTextsPosition?: KeyTextsPostitionEnum;
  keyboardShortcutValidation?: (
    ks: KeyboardShortcutType,
    index?: number,
    opts?: {
      block?: BlockType;
      selected?: boolean;
    },
  ) => boolean;
  label?: () => string;
  loading?: boolean;
  menuItems?: FlyoutMenuItemType[];
  onClick?: () => void;
  renderFromState?: (executionState: ExecutionStateEnum) => any;
  uuid: ButtonUUIDEnum;
  visible?: boolean;
};

export interface UseCodeBlockPropsType {
  header: CodeBlockHeaderProps;
};

export type CodeBlockHeaderProps = {
  buttons: ButtonType[];
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
