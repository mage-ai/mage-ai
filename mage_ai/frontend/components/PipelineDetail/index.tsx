import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CSSTransition } from 'react-transition-group';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import BlockType, { BlockRequestPayloadType, BlockTypeEnum, SetEditingBlockType } from '@interfaces/BlockType';
import CodeBlock from '@components/CodeBlock';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import KernelType, { SetMessagesType } from '@interfaces/KernelType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import usePrevious from '@utils/usePrevious';
import {
  ANIMATION_DURATION,
  OverlayStyle,
  PipelineContainerStyle,
} from './index.style';
import {
  KEY_CODES_SYSTEM,
  KEY_CODE_A,
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_B,
  KEY_CODE_D,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_I,
  KEY_CODE_META,
  KEY_CODE_NUMBER_0,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useKeyboardContext } from '@context/Keyboard';

type PipelineDetailProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  addWidget: (widget: BlockType, opts?: {
    onCreateCallback?: (block: BlockType) => void;
  }) => Promise<any>;
  anyInputFocused: boolean;
  blockRefs: any;
  blocks: BlockType[];
  deleteBlock: (block: BlockType) => void;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  interruptKernel: () => void;
  isPipelineUpdating: boolean;
  kernel: KernelType;
  mainContainerRef: any;
  mainContainerWidth: number;
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  onChangeCodeBlock: (uuid: string, value: string) => void;
  pipeline: PipelineType;
  pipelineContentTouched: boolean;
  pipelineLastSaved: Date;
  restartKernel: () => void;
  runBlock: (payload: {
    block: BlockType;
    code: string;
    runUpstream?: boolean;
  }) => void;
  runningBlocks: BlockType[];
  savePipelineContent: () => void;
  selectedBlock: BlockType;
  setActiveSidekickView: (view: ViewKeyEnum) => void;
  setAnyInputFocused: (value: boolean) => void;
  setOutputBlocks: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setPipelineContentTouched: (value: boolean) => void;
  setRunningBlocks: (blocks: BlockType[]) => void;
  setSelectedBlock: (block: BlockType) => void;
  setSelectedOutputBlock: (block: BlockType) => void;
  setTextareaFocused: (value: boolean) => void;
  textareaFocused: boolean;
  widgets: BlockType[];
} & SetEditingBlockType & SetMessagesType;

function PipelineDetail({
  addNewBlockAtIndex,
  addWidget,
  anyInputFocused,
  blockRefs,
  blocks = [],
  deleteBlock,
  fetchFileTree,
  fetchPipeline,
  interruptKernel,
  isPipelineUpdating,
  kernel,
  mainContainerRef,
  mainContainerWidth,
  messages,
  onChangeCodeBlock,
  pipeline,
  pipelineContentTouched,
  pipelineLastSaved,
  restartKernel,
  runBlock,
  runningBlocks = [],
  savePipelineContent,
  selectedBlock,
  setActiveSidekickView,
  setAnyInputFocused,
  setEditingBlock,
  setMessages,
  setOutputBlocks,
  setPipelineContentTouched,
  setRunningBlocks,
  setSelectedBlock,
  setSelectedOutputBlock,
  setTextareaFocused,
  textareaFocused,
  widgets,
}: PipelineDetailProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [visibleOverlay, setVisibleOverlay] = useState<boolean>(true);

  const runningBlocksByUUID = useMemo(() => runningBlocks.reduce((
    acc: {
      [uuid: string]: BlockType;
    },
    block: BlockType,
    idx: number,
  ) => ({
    ...acc,
    [block.uuid]: {
      ...block,
      priority: idx,
    },
  }), {}), [runningBlocks]);

  const selectedBlockPrevious = usePrevious(selectedBlock);
  const numberOfBlocks = useMemo(() => blocks.length, [blocks]);

  const uuidKeyboard = 'PipelineDetail/index';
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (pipelineContentTouched && onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping)) {
        event.preventDefault();
        const warning = 'You have changes that are unsaved. Click cancel and save your changes before reloading page.';
        if (typeof window !== 'undefined' && typeof location !== 'undefined' && window.confirm(warning)) {
          location.reload();
        }
      } else if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)) {
        event.preventDefault();
        savePipelineContent();
      } else if (textareaFocused) {
        if (keyMapping[KEY_CODE_ESCAPE]) {
          setTextareaFocused(false);
        } else if (!pipelineContentTouched && !KEY_CODES_SYSTEM.find(key => keyMapping[key])) {
          setPipelineContentTouched(true);
        }
      } else {
        if (selectedBlock) {
          const selectedBlockIndex =
            blocks.findIndex(({ uuid }: BlockType) => selectedBlock.uuid === uuid);

          if (keyMapping[KEY_CODE_ESCAPE]) {
            setSelectedBlock(null);
          } else if (keyHistory[0] === KEY_CODE_I
            && keyHistory[1] === KEY_CODE_I
          ) {
            interruptKernel();
          } else if (keyHistory[0] === KEY_CODE_D
            && keyHistory[1] === KEY_CODE_D
            && selectedBlockIndex !== -1
          ) {
            deleteBlock(selectedBlock);
            setTimeout(() => {
              if (selectedBlockIndex === blocks.length - 1) {
                setSelectedBlock(blocks[selectedBlockIndex - 1]);
              } else if (blocks.length >= 0) {
                setSelectedBlock(blocks[selectedBlockIndex + 1]);
              } else {
                setSelectedBlock(null);
              }
            }, 100);
          } else if (keyMapping[KEY_CODE_ARROW_UP] && selectedBlockIndex >= 1) {
            setSelectedBlock(blocks[selectedBlockIndex - 1]);
          } else if (keyMapping[KEY_CODE_ARROW_DOWN] && selectedBlockIndex <= numberOfBlocks - 2) {
            setSelectedBlock(blocks[selectedBlockIndex + 1]);
          } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping)) {
            setTextareaFocused(true);
          } else if (!anyInputFocused && onlyKeysPresent([KEY_CODE_A], keyMapping)) {
            addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex, setSelectedBlock);
          } else if (!anyInputFocused && onlyKeysPresent([KEY_CODE_B], keyMapping)) {
            addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex + 1, setSelectedBlock);
          }
        } else if (selectedBlockPrevious) {
          if (keyMapping[KEY_CODE_ENTER]) {
            setSelectedBlock(selectedBlockPrevious);
          }
        }

        if (keyHistory[0] === KEY_CODE_NUMBER_0 && keyHistory[1] === KEY_CODE_NUMBER_0) {
          restartKernel();
        }
      }
    },
    [
      addNewBlockAtIndex,
      anyInputFocused,
      blocks,
      interruptKernel,
      numberOfBlocks,
      pipelineContentTouched,
      restartKernel,
      savePipelineContent,
      selectedBlock,
      selectedBlockPrevious,
      setPipelineContentTouched,
      setSelectedBlock,
      setTextareaFocused,
      textareaFocused,
    ],
  );

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (pipelineContentTouched) {
        savePipelineContent();
      }
    }, 5000);

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [
    pipelineContentTouched,
    savePipelineContent,
  ]);

  useEffect(() => {
    setTimeout(() => setVisible(true), ANIMATION_DURATION * 2);
  }, [pipeline]);

  return (
    <>
      <PipelineContainerStyle>
        {visibleOverlay && (
          <CSSTransition
            classNames="pipeline-detail"
            in={visible}
            onEntered={() => setTimeout(() => setVisibleOverlay(false), ANIMATION_DURATION)}
            timeout={1}
          >
            <OverlayStyle />
          </CSSTransition>
        )}
      </PipelineContainerStyle>

      <Spacing mt={1} px={PADDING_UNITS}>
        {blocks.map((block: BlockType, idx: number) => {
          const {
            type,
            uuid,
          } = block;
          const selected: boolean = selectedBlock?.uuid === uuid;
          const runningBlock = runningBlocksByUUID[uuid];
          const executionState = runningBlock
            ? (runningBlock.priority === 0
              ? ExecutionStateEnum.BUSY
              : ExecutionStateEnum.QUEUED
             )
            : ExecutionStateEnum.IDLE;

          const path = `${type}s/${uuid}.py`;
          blockRefs.current[path] = createRef();

          return (
            <CodeBlock
              addNewBlock={(b: BlockRequestPayloadType) => {
                setTextareaFocused(true);

                return addNewBlockAtIndex(b, idx + 1, setSelectedBlock);
              }}
              addWidget={addWidget}
              block={block}
              blockRefs={blockRefs}
              blocks={blocks}
              defaultValue={block.content}
              deleteBlock={(b: BlockType) => {
                deleteBlock(b);
                setAnyInputFocused(false);
              }}
              executionState={executionState}
              fetchFileTree={fetchFileTree}
              fetchPipeline={fetchPipeline}
              interruptKernel={interruptKernel}
              key={uuid}
              mainContainerRef={mainContainerRef}
              mainContainerWidth={mainContainerWidth}
              messages={messages[uuid]}
              noDivider={idx === numberOfBlocks - 1}
              onChange={(value: string) => onChangeCodeBlock(uuid, value)}
              pipeline={pipeline}
              ref={blockRefs.current[path]}
              runBlock={runBlock}
              runningBlocks={runningBlocks}
              selected={selected}
              setActiveSidekickView={setActiveSidekickView}
              setAnyInputFocused={setAnyInputFocused}
              setEditingBlock={setEditingBlock}
              setOutputBlocks={setOutputBlocks}
              setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
              setSelectedOutputBlock={setSelectedOutputBlock}
              setTextareaFocused={setTextareaFocused}
              textareaFocused={selected && textareaFocused}
              widgets={widgets}
            />
          );
        })}

        <Spacing mt={PADDING_UNITS}>
          <AddNewBlocks
            addNewBlock={(newBlock: BlockRequestPayloadType) => {
              const block = blocks[blocks.length - 1];

              let content = null;
              const upstreamBlocks = [];

              if (block) {
                if (BlockTypeEnum.CHART !== block.type
                  && BlockTypeEnum.SCRATCHPAD !== block.type
                  && BlockTypeEnum.DATA_LOADER !== newBlock.type
                  && BlockTypeEnum.CHART !== newBlock.type
                  && BlockTypeEnum.SCRATCHPAD !== newBlock.type
                ) {
                  upstreamBlocks.push(block.uuid);
                }

                if (BlockTypeEnum.CHART !== block.type
                  && BlockTypeEnum.SCRATCHPAD !== block.type
                  && BlockTypeEnum.SCRATCHPAD === newBlock.type
                ) {
                  content = `from mage_ai.data_preparation.variable_manager import get_variable


df = get_variable('${pipeline.uuid}', '${block.uuid}', 'df')
`;
                }
              }

              addNewBlockAtIndex({
                ...newBlock,
                content,
                upstream_blocks: upstreamBlocks,
              }, numberOfBlocks, setSelectedBlock);
              setTextareaFocused(true);
            }}
          />
        </Spacing>
      </Spacing>
    </>
  );
}

export default PipelineDetail;
