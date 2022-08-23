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
} from '@interfaces/KernelOutputType';
import Text from '@oracle/elements/Text';
import { OutputContainerStyle } from './index.style';
import { Close, PlayButton } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';

export type PipelineExecutionProps = {
  cancelPipeline: () => void;
  executePipeline: () => void;
  isPipelineExecuting: boolean;
  pipelineMessages: KernelOutputType[];
};

function PipelineExecution({
  cancelPipeline,
  executePipeline,
  isPipelineExecuting,
  pipelineMessages,
}: PipelineExecutionProps) {
  const numberOfMessages = useMemo(() => pipelineMessages?.length || 0, [pipelineMessages]);

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
          {pipelineMessages.map(({
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
