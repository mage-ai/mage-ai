import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import usePrevious from '@utils/usePrevious';
import {
  DataTypeEnum,
  ExecutionStateEnum,
  KernelOutputType,
} from '@interfaces/KernelOutputType';

function Test() {
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
    setRunCount(1 + runCount);
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

  return (
    <Spacing p={5}>
      <CodeEditor
        // autoSave
        defaultValue={`import mage_ai
from mage_ai.sample_datasets import load_dataset


df = load_dataset('titanic_survival.csv')
print(len(df.index))
df.head(10)
`}
        height="calc(50vh)"
        onSave={saveCodeText}
        width="calc(100vw - 90px)"
      />

      {messages.map(({
        data,
        type: dataType,
      }: KernelOutputType, idx: number) => {
        if (!data) {
          return;
        }

        return (
          <div key={data}>
            {(dataType === DataTypeEnum.TEXT || dataType === DataTypeEnum.TEXT_PLAIN) && (
              <Text monospace>
                {data}
              </Text>
            )}
            {dataType === DataTypeEnum.IMAGE_PNG && (
              <img
                alt={`Image {idx} from code output`}
                src={`data:image/png;base64, ${data}`}
              />
            )}
          </div>
        );
      })}

      {isInProgress && (
        <Spacing mt={1}>
          <Spinner />
        </Spacing>
      )}

      {!isInProgress && runCount >= 1 && (
        <Spacing mt={2}>
          <Text>
            Run count: {runCount}
          </Text>
          <Text>
            Execution time: {(runEndTime - runStartTime) / 1000}s
          </Text>
        </Spacing>
      )}
    </Spacing>
  );
}

export default Test;
