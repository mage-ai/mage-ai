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
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { WEBSOCKT_URL } from '@utils/constants';
import { getNewUUID } from '@utils/string';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { onSuccess } from '@api/utils/response';
import {
  pushAtIndex,
  removeAtIndex,
} from '@utils/array';
import { randomNameGenerator } from '@utils/string';
import { useKernelContext } from '@context/Kernel';
import { useKeyboardContext } from '@context/Keyboard';
import { usePipelineContext } from '@context/Pipeline';

type PipelineDetailProps = {
  mainContainerRef: any;
  selectedBlock: BlockType;
  setSelectedBlock: (block: BlockType) => void;
};

function PipelineDetail({
  mainContainerRef,
  selectedBlock,
  setSelectedBlock,
}: PipelineDetailProps) {
  const { pipeline } = usePipelineContext();
  const {
    interruptKernel,
    kernel,
    restartKernel,
  } = useKernelContext();

  const [anyInputFocused, setAnyInputFocused] = useState(false);
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});
  const [runningBlocks, setRunningBlocks] = useState<BlockType[]>([]);

  const [textareaFocused, setTextareaFocused] = useState(false);
  const selectedBlockPrevious = usePrevious(selectedBlock);

  useEffect(() => {
    setBlocks(pipeline.blocks);
  }, [
    pipeline.blocks,
    setBlocks,
  ]);

  const numberOfBlocks = useMemo(() => blocks.length, [blocks]);
  const [createBlock] = useMutation(api.blocks.pipelines.useCreate(pipeline?.uuid));
  const addNewBlockAtIndex = useCallback((
    block: BlockType,
    idx: number,
    onCreate?: (block: BlockType) => void,
  ) => {
    const name = randomNameGenerator();
    // @ts-ignore
    createBlock({
      block: {
        name,
        ...block,
      },
    }).then((response: {
      data: {
        block: BlockType;
      };
    }) => {
      onSuccess(
        response, {
          callback: () => {
            const {
              data: {
                block,
              },
            } = response;
            setBlocks((previousBlocks) => pushAtIndex(block, idx, previousBlocks));
            onCreate?.(block);
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      );
    });
  }, [
    createBlock,
    setBlocks,
  ]);

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

      setMessages((messagesPrevious) => {
        const messagesFromUUID = messagesPrevious[uuid] || [];

        return {
          ...messagesPrevious,
          [uuid]: messagesFromUUID.concat(message),
        };
      });

      if (ExecutionStateEnum.IDLE === executionState) {
        setRunningBlocks((runningBlocksPrevious) =>
          runningBlocksPrevious.filter(({ uuid: uuid2 }) => uuid !== uuid2),
        );
      }
    }
  }, [
    lastMessage,
    setMessages,
    setRunningBlocks,
  ]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

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
          uuid,
        }));

        setMessages((messagesPrevious) => {
          delete messagesPrevious[uuid];

          return messagesPrevious;
        });

        setTextareaFocused(false);

        setRunningBlocks((runningBlocksPrevious) => {
          if (runningBlocksPrevious.find(({ uuid: uuid2 }) => uuid === uuid2)) {
            return runningBlocksPrevious;
          }

          return runningBlocksPrevious.concat(block);
        });
      }
    }
  }, [
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
      if (textareaFocused) {
        if (keyMapping[KEY_CODE_ESCAPE]) {
          setTextareaFocused(false);
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
            setBlocks(removeAtIndex(blocks, selectedBlockIndex))
          } else if (keyMapping[KEY_CODE_ARROW_UP] && selectedBlockIndex >= 1) {
            setSelectedBlock(blocks[selectedBlockIndex - 1]);
          } else if (keyMapping[KEY_CODE_ARROW_DOWN] && selectedBlockIndex <= numberOfBlocks - 2) {
            setSelectedBlock(blocks[selectedBlockIndex + 1]);
          } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping)) {
            setTextareaFocused(true);
          } else if (keyMapping[KEY_CODE_A]) {
            addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex, setSelectedBlock);
          } else if (keyMapping[KEY_CODE_B]) {
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
      restartKernel,
      selectedBlock,
      selectedBlockPrevious,
      setBlocks,
      setSelectedBlock,
      setTextareaFocused,
      textareaFocused,
    ],
  );

  return (
    <Spacing p={PADDING_UNITS}>
      <Spacing mb={1}>
        <KernelStatus
          isBusy={runningBlocks.length >= 1}
          kernel={kernel}
          restartKernel={restartKernel}
        />
      </Spacing>

      {blocks.map((block: BlockType, idx: number) => {
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
            deleteBlock={(b: BlockType) => {
              setBlocks(removeAtIndex(
                blocks,
                blocks.findIndex(({ uuid: uuid2 }: BlockType) => b.uuid === uuid2),
              ));
              setAnyInputFocused(false);
            }}
            block={block}
            executionState={executionState}
            key={uuid}
            interruptKernel={interruptKernel}
            mainContainerRef={mainContainerRef}
            messages={messages[uuid]}
            noDivider={idx === numberOfBlocks - 1}
            runBlock={runBlock}
            selected={selected}
            setAnyInputFocused={setAnyInputFocused}
            setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
            setTextareaFocused={setTextareaFocused}
            textareaFocused={selected && textareaFocused}
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
  );
}

export default PipelineDetail;
