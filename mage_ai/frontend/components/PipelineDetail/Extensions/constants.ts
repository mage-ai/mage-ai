import AutocompleteItemType from '@interfaces/AutocompleteItemType';
import BlockType, {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import ErrorsType from '@interfaces/ErrorsType';
import KernelOutputType from '@interfaces/KernelOutputType';
import PipelineType from '@interfaces/PipelineType';

export type ExtensionProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  autocompleteItems: AutocompleteItemType[];
  blockRefs: any;
  blocks: BlockType[];
  blocksInNotebook: BlockType[];
  deleteBlock: (block: BlockType) => Promise<any>;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  interruptKernel: () => void;
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  onChangeCallbackBlock: (type: string, uuid: string, value: string) => void;
  onChangeCodeBlock: (type: string, uuid: string, value: string) => void;
  onSelectBlockFile?: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => void;
  pipeline: PipelineType;
  runBlock: (payload: {
    block: BlockType;
    code: string;
    runDownstream?: boolean;
    runSettings?: {
      run_model?: boolean;
    };
    runUpstream?: boolean;
    runTests?: boolean;
  }) => void;
  runningBlocks?: BlockType[];
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  selectedBlock?: BlockType;
  setAnyInputFocused?: (value: boolean) => void;
  setErrors: (errors: ErrorsType) => void;
  setHiddenBlocks: ((opts: {
    [uuid: string]: BlockType;
  }) => {
    [uuid: string]: BlockType;
  });
  setSelectedBlock: (block: BlockType) => void;
  setTextareaFocused: (textareaFocused: boolean) => void;
  showBrowseTemplates?: (opts?: {
    addNew?: boolean;
    blockType?: BlockTypeEnum;
    language?: BlockLanguageEnum;
  }) => void;
  showUpdateBlockModal?: (
    block: BlockType,
    name: string,
  ) => Promise<any>;
  textareaFocused: boolean;
};
