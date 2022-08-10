import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Ansi from 'ansi-to-react';

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
import { Close, PlayButton } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';

export type PipelineExecutionProps = {
  pipeline: PipelineType;
  pipelineMessages: KernelOutputType[];
  setPipelineMessages: (messages: KernelOutputType[]) => void; 
  savePipelineContent: () => Promise<any>;
  sendMessage: (message: any) => void;
};

function PipelineExecution({
  pipeline,
  pipelineMessages,
  savePipelineContent,
  setPipelineMessages,
  sendMessage,
}: PipelineExecutionProps) {
  const [isPipelineExecuting, setIsPipelineExecuting] = useState<boolean>(false);
  const [messages, setMessages] = useState<KernelOutputType[]>([]);
  const [lastMessageProcessed, setLastMessageProcessed] = useState<number>(0);
  const numberOfMessages = useMemo(() => messages?.length || 0, [messages]);

  const {
    uuid: pipelineUUID
  } = pipeline || {};

  const executePipeline = useCallback(() => {
    savePipelineContent().then(() => {
      setIsPipelineExecuting(true);
      setPipelineMessages([]);
      setLastMessageProcessed(0);
      setMessages([]);

      sendMessage(JSON.stringify({
        execute_pipeline: true,
        pipeline_uuid: pipelineUUID,
      }));
    });
  }, [
    pipelineUUID,
    savePipelineContent,
    sendMessage,
  ]);

  const cancelPipeline = useCallback(() => {
    sendMessage(JSON.stringify({
      cancel_pipeline: true,
      pipeline_uuid: pipelineUUID,
    }));
  }, [
    pipelineUUID,
    sendMessage,
  ]);

  useEffect(() => {
    const currentLength = pipelineMessages.length;
    if (currentLength > lastMessageProcessed) {
      const messagesToProcess = pipelineMessages.slice(lastMessageProcessed, currentLength)
      setLastMessageProcessed(currentLength);
      messagesToProcess.forEach(message => {
        const {
          execution_state: executionState,
          pipeline_uuid,
          uuid,
        } = message;
  
        if (pipeline_uuid === pipelineUUID) {
          setMessages((messagesPrevious) => [
            ...messagesPrevious,
            message,
          ]); 
          if (ExecutionStateEnum.IDLE === executionState && !uuid) {
            setIsPipelineExecuting(false);
          }
        }
      })
    }
  }, [
    pipelineMessages.length,
    setLastMessageProcessed,
    setMessages,
  ]);

  return (
    <>
      <FlexContainer>
        <Button
          beforeIcon={<PlayButton inverted size={UNIT * 2}/>}
          loading={isPipelineExecuting}
          onClick={executePipeline}
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
        <Spacing ml={1} />
        {isPipelineExecuting && (
          <Button
            beforeIcon={<Close inverted size={UNIT * 2}/>}
            onClick={cancelPipeline}
            success
          >
            <Text
              bold
              inverted
              primary={false}
            >
              Cancel Pipeline
            </Text>
          </Button>
        )}

      </FlexContainer>
      <OutputContainerStyle noScrollbarTrackBackground>
        <CodeBlockStyle
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
  );
}

export default PipelineExecution;
