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
import KernelOutputType from '@interfaces/KernelOutputType';
import PipelineType from '@interfaces/PipelineType';
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
import { useKeyboardContext } from '@context/Keyboard';

type PipelineDetailProps = {
  mainContainerRef: any;
  pipeline: PipelineType;
};

function PipelineDetail({
  mainContainerRef,
  pipeline,
}: PipelineDetailProps) {
  const [blocks, setBlocks] = useState<BlockType[]>([
    {
      type: BlockTypeEnum.DATA_LOADER,
      uuid: 'a',
    },
    {
      type: BlockTypeEnum.TRANSFORMER,
      uuid: 'b',
    },
  ]);
  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const selectedBlockPrevious = usePrevious(selectedBlock);

  const [restartKernel] = useMutation(
    api.restart.kernels.useCreate(pipeline?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {

          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {

          },
        },
      ),
    },
  );
  const [interruptKernel] = useMutation(
    api.interrupt.kernels.useCreate(pipeline?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {

          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {

          },
        },
      ),
    },
  );

  const numberOfBlocks = useMemo(() => blocks.length, [blocks]);
  const addNewBlockAtIndex = useCallback((block: BlockType, idx: number) => {
    const newBlock = {
      uuid: getNewUUID(),
      ...block,
    };
    const newBlocks = pushAtIndex(newBlock, idx, blocks);
    setBlocks(newBlocks);

    return newBlock;
  }, [
    blocks,
    setBlocks,
  ]);

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
          } else if (keyHistory[0] === KEY_CODE_I && keyHistory[1] === KEY_CODE_I) {
            interruptKernel();
          } else if (keyHistory[0] === KEY_CODE_D
            && keyHistory[1] === KEY_CODE_D
            && selectedBlockIndex !== -1
          ) {
            setBlocks(removeAtIndex(blocks, selectedBlockIndex))
          } else if (keyMapping[KEY_CODE_ARROW_UP] && selectedBlockIndex >= 1) {
            setSelectedBlock(blocks[selectedBlockIndex - 1]);
          } else if (keyMapping[KEY_CODE_ARROW_DOWN] && selectedBlockIndex <= numberOfBlocks - 2) {
            setSelectedBlock(blocks[selectedBlockIndex + 1]);
          } else if (keyMapping[KEY_CODE_ENTER]) {
            setTextareaFocused(true);
          } else if (keyMapping[KEY_CODE_A]) {
            setSelectedBlock(addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex));
          } else if (keyMapping[KEY_CODE_B]) {
            setSelectedBlock(addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex + 1));
          }
        } else if (selectedBlockPrevious) {
          if (keyMapping[KEY_CODE_ENTER]) {
            setSelectedBlock(selectedBlockPrevious);
          }
        }

        if (keyHistory[0] === KEY_CODE_NUMBER_0 && keyHistory[1] === KEY_CODE_NUMBER_0) {
          const warning = 'Do you want to restart the kernel? All variables will be cleared.';
          if (typeof window !== 'undefined' && window.confirm(warning)) {
            restartKernel();
          }
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
      const message = JSON.parse(lastMessage.data);
      const { uuid } = message;

      setMessages((messagesPrevious) => {
        const messagesFromUUID = messagesPrevious[uuid] || [];

        return {
          ...messagesPrevious,
          [uuid]: messagesFromUUID.concat(message),
        };
      });
    }
  }, [
    lastMessage,
    setMessages,
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
    const { uuid } = block;

    sendMessage(JSON.stringify({
      code,
      uuid,
    }));

    setMessages((messagesPrevious) => {
      delete messagesPrevious[uuid];

      return messagesPrevious;
    });

    setTextareaFocused(false);
  }, [
    sendMessage,
    setMessages,
    setTextareaFocused,
  ]);

  return (
    <Spacing p={PADDING_UNITS}>
      {blocks.map((block: BlockType, idx: number) => {
        const {
          uuid,
        } = block;
        const selected: boolean = selectedBlock?.uuid === uuid;

        return (
          <CodeBlock
            addNewBlock={(b: BlockType) => {
              setSelectedBlock(addNewBlockAtIndex(b, idx + 1));
              setTextareaFocused(true);
            }}
            deleteBlock={(b: BlockType) => setBlocks(removeAtIndex(
              blocks,
              blocks.findIndex(({ uuid: uuid2 }: BlockType) => b.uuid === uuid2),
            ))}
            block={block}
            key={uuid}
            interruptKernel={interruptKernel}
            mainContainerRef={mainContainerRef}
            messages={messages[uuid]}
            noDivider={idx === numberOfBlocks - 1}
            runBlock={runBlock}
            selected={selected}
            setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
            setTextareaFocused={setTextareaFocused}
            textareaFocused={selected && textareaFocused}
          />
        );
      })}

      <Spacing mt={PADDING_UNITS}>
        <AddNewBlocks
          addNewBlock={(b: BlockType) => {
            setSelectedBlock(addNewBlockAtIndex(b, numberOfBlocks));
            setTextareaFocused(true);
          }}
        />
      </Spacing>
    </Spacing>
  );
}

export default PipelineDetail;
