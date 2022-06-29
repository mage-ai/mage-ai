import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import Ansi from 'ansi-to-react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

import Button from '@oracle/elements/Button';
import CodeEditor, { OnDidChangeCursorPositionParameterType } from '@components/CodeEditor';
import KernelOutputType, {
  DataTypeEnum,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import usePrevious from '@utils/usePrevious';
import {
  ContainerStyle,
} from './index.style';
import { SINGLE_LINE_HEIGHT } from '@components/CodeEditor/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type CodeBlockProps = {
  defaultValue?: string;
  height?: number;
  mainContainerRef?: any;
  onDidChangeCursorPosition?: (opts: OnDidChangeCursorPositionParameterType) => void;
}

function CodeBlockProps({
  defaultValue,
  height,
  mainContainerRef,
}: CodeBlockProps) {
  const [messages, setMessages] = useState<KernelOutputType[]>([]);
  const [runCount, setRunCount] = useState<Number>(0);
  const [runEndTime, setRunEndTime] = useState<Number>(0);
  const [runStartTime, setRunStartTime] = useState<Number>(0);
  const socketUrlPublish = 'ws://localhost:6789/websocket/';

  const {
    sendMessage,
    lastMessage,
    readyState,
  } = useWebSocket(socketUrlPublish, {
    onMessage: ({
      data: messageData,
    }) => {
      if (messageData) {
        setMessages([
          ...messages,
          JSON.parse(messageData),
        ]);
      }
    },
    onOpen: () => console.log('socketUrlPublish opened'),
    // Will attempt to reconnect on all close events, such as server shutting down
    shouldReconnect: (closeEvent) => true,
  });

  const saveCodeText = useCallback((value: string) => {
    sendMessage(JSON.stringify({
      code: value,
    }));
    setMessages([]);
    setRunCount(1 + Number(runCount));
    setRunEndTime(0)
    setRunStartTime(Number(new Date()));
  }, [
    runCount,
    runEndTime,
    sendMessage,
    setMessages,
    setRunCount,
    setRunEndTime,
    setRunStartTime,
  ]);

  const finalExecutionState = messages?.[messages.length - 1]?.execution_state;
  const isInProgress = messages?.length >= 1 && finalExecutionState !== ExecutionStateEnum.IDLE;

  const finalExecutionStatePrevious = usePrevious(finalExecutionState);
  useEffect(() => {
    if (finalExecutionState === ExecutionStateEnum.IDLE
      && finalExecutionState !== finalExecutionStatePrevious
    ) {
      setRunEndTime(Number(new Date()));
    }
  }, [
    finalExecutionState,
    finalExecutionStatePrevious,
    setRunEndTime,
  ]);

  const onDidChangeCursorPosition = useCallback(({
    editorRect: {
      height,
      top,
    },
    position: {
      lineNumber,
    },
  }: OnDidChangeCursorPositionParameterType) => {
    if (mainContainerRef?.current) {
      const {
        height: mainContainerHeight,
      } = mainContainerRef.current.getBoundingClientRect();

      const heightAtLineNumber = lineNumber * SINGLE_LINE_HEIGHT;

      if (top + heightAtLineNumber > mainContainerHeight) {
        const newY = mainContainerRef.current.scrollTop
          + ((heightAtLineNumber - mainContainerHeight) + top);

        mainContainerRef.current.scrollTo(0, newY);
      } else if (heightAtLineNumber + top < SINGLE_LINE_HEIGHT) {
        const newY = mainContainerRef.current.scrollTop
          + ((heightAtLineNumber + top) - SINGLE_LINE_HEIGHT);
        mainContainerRef.current.scrollTo(0, newY);
      }
    }
  }, [
    mainContainerRef,
  ]);

  return (
    <Spacing px={PADDING_UNITS}>
      <ContainerStyle>
        <CodeEditor
          autoHeight
          // autoSave
          defaultValue={defaultValue}
          height={height}
          onDidChangeCursorPosition={onDidChangeCursorPosition}
          onSave={saveCodeText}
          width="100%"
        />
      </ContainerStyle>

      {messages.map(({
        data: dataInit,
        type: dataType,
      }: KernelOutputType, idx: number) => {
        if (!dataInit || dataInit?.length === 0) {
          return;
        }

        let dataArray: string[] = [];
        if (Array.isArray(dataInit)) {
          dataArray = dataInit;
        } else {
          dataArray = [dataInit];
        }

        return dataArray.map((data: string) => (
          <div key={data}>
            {(dataType === DataTypeEnum.TEXT || dataType === DataTypeEnum.TEXT_PLAIN) && (
              <Text monospace>
                <Ansi>
                  {data}
                </Ansi>
              </Text>
            )}
            {dataType === DataTypeEnum.IMAGE_PNG && (
              <img
                alt={`Image {idx} from code output`}
                src={`data:image/png;base64, ${data}`}
              />
            )}
          </div>
        ));
      })}

      {isInProgress && (
        <Spacing mt={1}>
          <Spinner />
        </Spacing>
      )}

      {!isInProgress && runCount >= 1 && runEndTime >= runStartTime && (
        <Spacing mt={2}>
          <Text>
            Run count: {runCount}
          </Text>
          <Text>
            Execution time: {(Number(runEndTime) - Number(runStartTime)) / 1000}s
          </Text>
        </Spacing>
      )}
    </Spacing>
  );
}

export default CodeBlockProps;
