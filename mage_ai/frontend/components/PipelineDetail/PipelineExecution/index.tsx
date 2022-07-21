import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Ansi from 'ansi-to-react';
import useWebSocket from 'react-use-websocket';

import Button from '@oracle/elements/Button';
import {
  ContainerStyle as CodeBlockStyle,
  OutputRowStyle,
} from '@components/CodeBlock/CodeOutput/index.style';
import KernelOutputType, {
    DataTypeEnum,
    DATA_TYPE_TEXTLIKE,
    ExecutionStateEnum,
    MsgType,
} from '@interfaces/KernelOutputType';
import PipelineType from '@interfaces/PipelineType';
import Text from '@oracle/elements/Text';
import { OutputContainerStyle } from './index.style';
import { PlayButton } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { WEBSOCKT_URL } from '@utils/constants';

export type PipelineExecutionProps = {
  pipeline: PipelineType;
};

function PipelineExecution({
  pipeline,
}: PipelineExecutionProps) {
  const [isPipelineExecuting, setIsPipelineExecuting] = useState<boolean>(false);
  const [messages, setMessages] = useState<KernelOutputType[]>([]);
  const numberOfMessages = useMemo(() => messages?.length || 0, [messages]);

  const {
    uuid: pipelineUUID
  } = pipeline || {};

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

  const executePipeline = useCallback(() => {
    setMessages([]);

    sendMessage(JSON.stringify({
      pipeline_uuid: pipelineUUID,
      execute_pipeline: true,
    }))

    setIsPipelineExecuting(true);
  }, [
    pipelineUUID,
    sendMessage,
  ])

  useEffect(() => {
    if (lastMessage) {
      const message: KernelOutputType = JSON.parse(lastMessage.data);
      const {
        execution_state: executionState,
        pipeline_uuid,
        msg_type: msgType,
      } = message;

      if (pipeline_uuid === pipelineUUID && msgType === MsgType.STREAM_PIPELINE) {
        setMessages((messagesPrevious) => {
  
          return [
            ...messagesPrevious,
            message,
          ];
        });
      }

      if (ExecutionStateEnum.IDLE === executionState) {
        setIsPipelineExecuting(false);
      }
    }
  }, [
    lastMessage,
    setMessages,
  ]);

  return (
    <>
      <Button
        beforeIcon={<PlayButton inverted size={UNIT * 2}/>}
        loading={isPipelineExecuting}
        onClick={() => executePipeline()}
        success
      >
        <Text
          bold
          inverted
          primary={false}
        >
          Execute pipeline
        </Text>
      </Button>
      <OutputContainerStyle noScrollbarTrackBackground>
        <CodeBlockStyle
          // blockType={BlockTypeEnum.DATA_EXPORTER}
          executedAndIdle
          hasError={false}
          selected
        >
          {messages.map(({
            data: dataInit,
            type: dataType,
          }: KernelOutputType, idx: number) => {
            let dataArray: string[] = [];
            if (Array.isArray(dataInit)) {
              dataArray = dataInit;
            } else {
              dataArray = [dataInit];
            }


            dataArray = dataArray.filter(d => d);
            const dataArrayLength = dataArray.length;

            return dataArray.map((data: string, idxInner: number) => {
              let displayElement;
              const outputRowSharedProps = {
                first: idx === 0 && idxInner === 0,
                last: idx === numberOfMessages - 1 && idxInner === dataArrayLength - 1,
              };

              if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
                displayElement = (
                  <OutputRowStyle {...outputRowSharedProps}>
                    <Text monospace preWrap>
                      <Ansi>
                        {data}
                      </Ansi>
                    </Text>
                  </OutputRowStyle>
                );
              } else if (dataType === DataTypeEnum.IMAGE_PNG) {
                displayElement = (
                  <div style={{ backgroundColor: 'white' }}>
                    <img
                      alt={`Image ${idx} from code output`}
                      src={`data:image/png;base64, ${data}`}
                    />
                  </div>
                );
              }

              return (
                <div key={`code-output-${idx}-${idxInner}`}>
                  {displayElement}
                </div>
              );
            });
          })}
        </CodeBlockStyle>
      </OutputContainerStyle>
    </>
  )
}

export default PipelineExecution;
