import BlockType from '@interfaces/BlockType';
import ConfigurationOptionType from '@interfaces/ConfigurationOptionType';
import ErrorsType from '@interfaces/ErrorsType';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import LLMType from '@interfaces/LLMType';
import PipelineType from '@interfaces/PipelineType';
import ProjectType from '@interfaces/ProjectType';
import StatusType from '@interfaces/StatusType';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { KeyTextsPostitionEnum } from '@oracle/elements/Button/KeyboardShortcutButton';
import { MenuGroupType } from '@components/FileEditor/Header';
import { NumberOrString } from '@oracle/elements/KeyboardTextGroup';
import { OnDidChangeCursorPositionParameterType } from '@components/CodeEditor';
import { ProvidersType } from '@components/CodeEditor/autocomplete/constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { ThemeType } from '@oracle/styles/themes/constants';
import { ViewKeyEnum } from '@components/Sidekick/constants';

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

type CodeBlockOutputOutputProps = {
  blockIndex?: number;
  blockOutputRef?: any;
  collapsed?: boolean;
  errorMessages?: string[];
  isHidden?: boolean;
  mainContainerWidth?: number;
  messages?: KernelOutputType[];
  runCount?: number;
  runEndTime?: number;
  runStartTime?: number;
  runningBlocks?: BlockType[];
  setOutputBlocks?: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setSelectedOutputBlock?: (block: BlockType) => void;
};

export type UseCodeBlockComponentProps = {
  addNewBlock?: (block: BlockType, downstreamBlocks?: BlockType[]) => Promise<any>;
  allowCodeBlockShortcuts?: boolean;
  autocompleteProviders?: ProvidersType;
  block: BlockType;
  blockRef?: any;
  blocks?: BlockType[];
  codeCollapsed?: boolean;
  content?: string;
  dbtConfigurationOptions?: ConfigurationOptionType[];
  deleteBlock?: (block: BlockType) => void,
  disableShortcuts?: boolean;
  executionState?: ExecutionStateEnum;
  height?: number | string;
  hideRunButton?: boolean;
  interruptKernel: () => void;
  onChange?: (value: string) => void;
  onContentSizeChangeCallback?: () => void;
  onDidChangeCursorPosition?: (opts: OnDidChangeCursorPositionParameterType) => void;
  onMountCallback?: (editor?: any, monaco?: any) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    addon: AddonBlockTypeEnum,
    blockUUID: string;
  }) => void;
  outputCollapsed?: boolean;
  outputProps?: CodeBlockOutputOutputProps;
  placeholder?: string;
  pipeline?: PipelineType;
  runBlockAndTrack?: (payload?: RunBlockAndTrackProps) => void;
  savePipelineContent?: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  scrollTogether?: boolean;
  selected?: boolean;
  setCodeCollapsed?: (value: boolean) => void;
  setErrors?: (errors: ErrorsType) => void;
  setHiddenBlocks?: ((opts: {
    [uuid: string]: BlockType;
  }) => {
    [uuid: string]: BlockType;
  });
  setOutputCollapsed?: (value: boolean) => void;
  setScrollTogether?: (prev: any) => void;
  setSelected?: (value: boolean) => void;
  setSideBySideEnabled?: (prev: any) => void;
  showConfigureProjectModal?: (opts: {
    cancelButtonText?: string;
    header?: any;
    onCancel?: () => void;
    onSaveSuccess?: (project: ProjectType) => void;
  }) => void;
  setTextareaFocused?: (value: boolean) => void;
  sideBySideEnabled?: boolean;
  status?: StatusType;
  textareaFocused?: boolean;
  theme?: ThemeType;
  updatePipeline?: (payload: {
    pipeline: {
      add_upstream_for_block_uuid?: string;
      llm?: LLMType;
    };
  }) => Promise<any>;
};

export type ButtonType = {
  Icon?: any;
  color?: string;
  description?: string | any;
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
  onClick?: (opts?: {
    selectedHeaderTab?: TabType;
    setSelectedHeaderTab?: (tab: TabType) => void;
  }) => void;
  renderFromState?: (executionState: ExecutionStateEnum) => any;
  uuid: ButtonUUIDEnum;
  visible?: (opts?: {
    active?: boolean;
    running?: boolean;
    waiting?: boolean;
  }) => boolean;
};

export type UseCodeBlockPropsType = {} & UseCodeBlockComponentProps;

export type CodeBlockEditorProps = {
} & UseCodeBlockComponentProps;

type CodeBlockOutputReturnProps = {
  menuGroups?: MenuGroupType[];
  tabs?: TabType[];
};

export type CodeBlockOutputProps = {
  headerRef: any;
  selectedOutputTabs?: {
    [uuid: string]: TabType;
  };
  setSelectedOutputTabs: (prev: any) => {
    [uuid: string]: TabType;
  };
  subheaderVisible?: boolean;
} & CodeBlockOutputReturnProps & CodeBlockOutputOutputProps & UseCodeBlockComponentProps;

type CodeBlockHeaderReturnProps = {
  buttons?: ButtonType[];
  menuGroups?: MenuGroupType[];
  subheaderVisibleDefault?: (block: BlockType) => boolean;
  subtitle?: string;
  tabs?: TabType[];
  title?: string;
};

export type CodeBlockHeaderProps = CodeBlockHeaderReturnProps & UseCodeBlockComponentProps;

export type HeaderTabType = {
  renderTabContent: (tab: TabType, defaultContent: any) => any;
};

export interface UseCodeBlockComponentType {
  editor?: any;
  extraDetails?: any;
  footer?: any;
  header?: any;
  headerTabContent?: any;
  output?: any;
  tags?: any;
}

export interface UseCodeBlockPropsReturnType {
  editor?: any;
  extraDetails?: any;
  footer?: any;
  header?: CodeBlockHeaderReturnProps;
  headerTabContent?: HeaderTabType;
  output?: CodeBlockOutputReturnProps;
  tags?: any;
}
