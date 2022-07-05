import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useMutation } from 'react-query';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import CodeBlock from '@components/CodeBlock';
import KernelStatus from './KernelStatus';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import usePrevious from '@utils/usePrevious';
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
import { useBlockContext } from '@context/Block';
import { useKernelContext } from '@context/Kernel';
import { useKeyboardContext } from '@context/Keyboard';
import { usePipelineContext } from '@context/Pipeline';

type PipelineDetailProps = {
  blocks: BlockType[];
  deleteBlock: (block: BlockType) => void;
  isPipelineUpdating: boolean;
  mainContainerRef: any;
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  pipelineContentTouched: boolean;
  pipelineLastSaved: Date;
  runningBlocks: BlockType[];
  selectedBlock: BlockType;
  setContentByBlockUUID: (data: {
    [uuid: string]: string;
  }) => void;
  setPipelineContentTouched: (value: boolean) => void;
};

function PipelineDetail({
  blocks = [],
  deleteBlock,
  isPipelineUpdating,
  mainContainerRef,
  messages,
  pipelineContentTouched,
  pipelineLastSaved,
  runningBlocks = [],
  selectedBlock,
  setContentByBlockUUID,
  setPipelineContentTouched,
}: PipelineDetailProps) {
  const {
    pipeline,
    savePipelineContent,
  } = usePipelineContext();
  const {
    interruptKernel,
    kernel,
    restartKernel,
    setMessages,
  } = useKernelContext();
  const {
    addNewBlockAtIndex,
    setBlocks,
    setRunningBlocks,
    setSelectedBlock,
  } = useBlockContext();

  const [anyInputFocused, setAnyInputFocused] = useState<boolean>(false);
  const [textareaFocused, setTextareaFocused] = useState<boolean>(false);

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
            if (selectedBlockIndex - 1 >= 0) {
              setSelectedBlock(blocks[selectedBlockIndex - 1]);
            } else if (blocks.length >= 2) {
              setSelectedBlock(blocks[selectedBlockIndex + 1]);
            } else {
              setSelectedBlock(null);
            }
            deleteBlock(selectedBlock);
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
      setBlocks,
      setPipelineContentTouched,
      setSelectedBlock,
      setTextareaFocused,
      textareaFocused,
    ],
  );

  const blockElements = useMemo(() => blocks.map((block: BlockType, idx: number) => {
    const {
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
        messages={messages[uuid]}
        noDivider={idx === numberOfBlocks - 1}
        onChange={(value: string) => setContentByBlockUUID({ [uuid]: value })}
        runBlock={runBlock}
        selected={selected}
        setAnyInputFocused={setAnyInputFocused}
        setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
        setTextareaFocused={setTextareaFocused}
        textareaFocused={selected && textareaFocused}
      />
    );
  }), [
    addNewBlockAtIndex,
    blocks,
    interruptKernel,
    mainContainerRef,
    messages,
    numberOfBlocks,
    runBlock,
    runningBlocksByUUID,
    selectedBlock,
    setAnyInputFocused,
    setContentByBlockUUID,
    setBlocks,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
  ]);

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

  return (
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

      {blockElements}

      <Spacing mt={PADDING_UNITS}>
        <AddNewBlocks
          addNewBlock={(b: BlockType) => {
            addNewBlockAtIndex(b, numberOfBlocks, setSelectedBlock);
            setTextareaFocused(true);
          }}
        />
      </Spacing>
    </Spacing>
  );
}

export default PipelineDetail;
