import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { CSSTransition } from 'react-transition-group';
import { useMutation } from 'react-query';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import BlockType, { BlockTypeEnum, SetEditingBlockType } from '@interfaces/BlockType';
import CodeBlock from '@components/CodeBlock';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import KernelStatus from './KernelStatus';
import KernelType, { SetMessagesType } from '@interfaces/KernelType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
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
import { WEBSOCKT_URL } from '@utils/constants';
import { getNewUUID } from '@utils/string';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { onSuccess } from '@api/utils/response';
import { useKeyboardContext } from '@context/Keyboard';

type PipelineDetailProps = {
  addNewBlockAtIndex: (
    block: BlockType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
  ) => void;
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
  messages: { [uuid: string]: KernelOutputType[]; };
  pipeline: PipelineType;
  pipelineContentTouched: boolean;
  pipelineLastSaved: Date;
  restartKernel: () => void;
  runningBlocks: BlockType[];
  savePipelineContent: () => void;
  selectedBlock: BlockType;
  setContentByBlockUUID: (data: { [uuid: string]: string; }) => void;
  setPipelineContentTouched: (value: boolean) => void;
  setRunningBlocks: (blocks: BlockType[]) => void;
  setSelectedBlock: (block: BlockType) => void;
} & SetEditingBlockType & SetMessagesType;

function PipelineDetail({
  addNewBlockAtIndex,
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
  pipeline,
  pipelineContentTouched,
  pipelineLastSaved,
  restartKernel,
  runningBlocks = [],
  savePipelineContent,
  selectedBlock,
  setContentByBlockUUID,
  setEditingBlock,
  setMessages,
  setPipelineContentTouched,
  setRunningBlocks,
  setSelectedBlock,
}: PipelineDetailProps) {
  const [anyInputFocused, setAnyInputFocused] = useState<boolean>(false);
  const [textareaFocused, setTextareaFocused] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [visibleOverlay, setVisibleOverlay] = useState<boolean>(true);

  const {
    lastMessage,
    readyState,
    sendMessage,
  } = useWebSocket(WEBSOCKT_URL, {
    onOpen: () => console.log('socketUrlPublish opened'),
    shouldReconnect: (closeEvent) => {
      // Will attempt to reconnect on all close events, such as server shutting down
      console.log('Attempting to reconnect...');

      return true;
    },
  });

  useEffect(() => {
    if (lastMessage) {
      const message: KernelOutputType = JSON.parse(lastMessage.data);
      const {
        execution_state: executionState,
        uuid,
      } = message;

      // @ts-ignore
      setMessages((messagesPrevious) => {
        const messagesFromUUID = messagesPrevious[uuid] || [];

        return {
          ...messagesPrevious,
          [uuid]: messagesFromUUID.concat(message),
        };
      });

      if (ExecutionStateEnum.IDLE === executionState) {
        // @ts-ignore
        setRunningBlocks((runningBlocksPrevious) =>
          runningBlocksPrevious.filter(({ uuid: uuid2 }) => uuid !== uuid2),
        );
      }

      setPipelineContentTouched(true);
    }
  }, [
    lastMessage,
    setMessages,
    setPipelineContentTouched,
    setRunningBlocks,
  ]);

  const runBlock = useCallback((payload: {
    block: BlockType;
    code: string;
  }) => {
    const {
      block,
      code,
    } = payload;

    if (code) {
      const { uuid } = block;
      const isAlreadyRunning = runningBlocks.find(({ uuid: uuid2 }) => uuid === uuid2);

      if (!isAlreadyRunning) {
        sendMessage(JSON.stringify({
          code,
          pipeline_uuid: pipeline.uuid,
          uuid,
        }));

        // @ts-ignore
        setMessages((messagesPrevious) => {
          delete messagesPrevious[uuid];

          return messagesPrevious;
        });

        setTextareaFocused(false);

        // @ts-ignore
        setRunningBlocks((runningBlocksPrevious) => {
          if (runningBlocksPrevious.find(({ uuid: uuid2 }) => uuid === uuid2)) {
            return runningBlocksPrevious;
          }

          return runningBlocksPrevious.concat(block);
        });
      }
    }
  }, [
    pipeline,
    runningBlocks,
    sendMessage,
    setMessages,
    setRunningBlocks,
    setTextareaFocused,
  ]);

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
          } else if (onlyKeysPresent([KEY_CODE_A], keyMapping)) {
            addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex, setSelectedBlock);
          } else if (onlyKeysPresent([KEY_CODE_B], keyMapping)) {
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

  const onChangeCodeBlock = useCallback(
    (uuid: string, value: string) => setContentByBlockUUID({ [uuid]: value }),
    [
      setContentByBlockUUID,
    ],
  );

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
          >
            <OverlayStyle />
          </CSSTransition>
        )}
      </PipelineContainerStyle>

      <Spacing p={PADDING_UNITS}>
        <Spacing mb={1}>
          <KernelStatus
            isBusy={runningBlocks.length >= 1}
            isPipelineUpdating={isPipelineUpdating}
            kernel={kernel}
            pipelineContentTouched={pipelineContentTouched}
            pipelineLastSaved={pipelineLastSaved}
            restartKernel={restartKernel}
          />
        </Spacing>

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
              addNewBlock={(b: BlockType) => {
                addNewBlockAtIndex(b, idx + 1, setSelectedBlock);
                setTextareaFocused(true);
              }}
              defaultValue={block.content}
              deleteBlock={(b: BlockType) => {
                deleteBlock(b);
                setAnyInputFocused(false);
              }}
              block={block}
              executionState={executionState}
              key={uuid}
              interruptKernel={interruptKernel}
              mainContainerRef={mainContainerRef}
              mainContainerWidth={mainContainerWidth}
              messages={messages[uuid]}
              noDivider={idx === numberOfBlocks - 1}
              onChange={(value: string) => onChangeCodeBlock(uuid, value)}
              ref={blockRefs.current[path]}
              runBlock={runBlock}
              selected={selected}
              setAnyInputFocused={setAnyInputFocused}
              setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
              setTextareaFocused={setTextareaFocused}
              textareaFocused={selected && textareaFocused}

              fetchFileTree={fetchFileTree}
              fetchPipeline={fetchPipeline}
              pipeline={pipeline}
              setEditingBlock={setEditingBlock}
            />
          );
        })}

        <Spacing mt={PADDING_UNITS}>
          <AddNewBlocks
            addNewBlock={(b: BlockType) => {
              addNewBlockAtIndex(b, numberOfBlocks, setSelectedBlock);
              setTextareaFocused(true);
            }}
          />
        </Spacing>
      </Spacing>
    </>
  );
}

export default PipelineDetail;
