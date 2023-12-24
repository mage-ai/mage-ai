import BlockType from '@interfaces/BlockType';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import PipelineType from '@interfaces/PipelineType';
import StatusType from '@interfaces/StatusType';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { KeyTextsPostitionEnum } from '@oracle/elements/Button/KeyboardShortcutButton';
import { MenuGroupType } from '@components/FileEditor/Header';
import { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import { OnDidChangeCursorPositionParameterType } from '@components/CodeEditor';
import { ProvidersType } from '@components/CodeEditor/autocomplete/constants';
import { ThemeType } from '@oracle/styles/themes/constants';

export enum ButtonUUIDEnum {
  BUILD = 'build',
  EXECUTE = 'execute',
  EXECUTE_CANCEL = 'execute_cancel',
  RUN = 'run',
  RUN_UPSTREAM = 'run_upstream',
  TEST = 'test',
}

export type RunBlockAndTrackProps = {
  block: BlockType;
  code?: string;
  disableReset?: boolean;
  runDownstream?: boolean;
  runIncompleteUpstream?: boolean;
  runSettings?: {
    build_model?: boolean;
    run_model?: boolean;
    test_model?: boolean;
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
  pipeline: PipelineType;
  runBlockAndTrack: (payload?: RunBlockAndTrackProps) => void;
  selected?: boolean;
  status: StatusType;
  theme: ThemeType;
};

export type ButtonType = {
  Icon?: any;
  color?: string;
  description?: string;
  disabled?: (opts?: {
    active?: boolean;
    running?: boolean;
    waiting?: boolean;
  }) => boolean;
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
  visible?: (opts?: {
    active?: boolean;
    running?: boolean;
    waiting?: boolean;
  }) => boolean;
};

export interface UseCodeBlockPropsType {
  header: CodeBlockHeaderProps;
};

export type CodeBlockEditorProps = {
  autocompleteProviders?: ProvidersType;
  content?: string;
  height?: number;
  onChange?: (value: string) => void;
  onContentSizeChangeCallback?: () => void;
  onDidChangeCursorPosition?: (opts: OnDidChangeCursorPositionParameterType) => void;
  onMountCallback?: () => void;
  placeholder?: string;
  setSelected?: (value: boolean) => void;
  setTextareaFocused?: (value: boolean) => void;
  shortcuts?: ((monaco: any, editor: any) => void)[];
  textareaFocused?: boolean;
} & UseCodeBlockComponentProps;

export type CodeBlockHeaderProps = {
  buttons: ButtonType[];
  menuGroups?: MenuGroupType[];
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
