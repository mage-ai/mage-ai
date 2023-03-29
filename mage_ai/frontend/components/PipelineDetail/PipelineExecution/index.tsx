import React, { useCallback, useMemo } from 'react';
import Ansi from 'ansi-to-react';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, {
  DataTypeEnum,
  DATA_TYPE_TEXTLIKE,
} from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { Close, PlayButton } from '@oracle/icons';
import {
  ContainerStyle as CodeBlockStyle,
  OutputRowStyle,
} from '@components/CodeBlock/CodeOutput/index.style';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN,
  set,
} from '@storage/localStorage';
import { OutputContainerStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';

export type PipelineExecutionProps = {
  cancelPipeline: () => void;
  checkIfPipelineRunning: () => void;
  executePipeline: () => void;
  isPipelineExecuting: boolean;
  pipelineExecutionHidden: boolean;
  pipelineMessages: KernelOutputType[];
  setPipelineExecutionHidden: (pipelineExecutionHidden: boolean) => void;
};

function PipelineExecution({
  cancelPipeline,
  checkIfPipelineRunning,
  executePipeline,
  isPipelineExecuting,
  pipelineExecutionHidden,
  pipelineMessages,
  setPipelineExecutionHidden,
}: PipelineExecutionProps) {
  const numberOfMessages = useMemo(() => pipelineMessages?.length || 0, [pipelineMessages]);
  const truncatedPipelineMessages = useMemo(() => (
    numberOfMessages > 100 ? pipelineMessages.slice(-100) : pipelineMessages
  ), [numberOfMessages, pipelineMessages]);

  const togglePipelineExecution = useCallback(() => {
    const val = !pipelineExecutionHidden;
    setPipelineExecutionHidden(val);
    set(LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN, val);
  }, [
    pipelineExecutionHidden,
    setPipelineExecutionHidden,
  ]);

  return (
    <>
      <FlexContainer alignItems="center" justifyContent="space-between">
        <Flex>
          <Button
            beforeIcon={<PlayButton inverted size={UNIT * 2}/>}
            compact={isPipelineExecuting}
            disabled={isPipelineExecuting}
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
            <>
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
                  Cancel pipeline
                </Text>
              </Button>
              <Spacing ml={1} />
            </>
          )}
          <Button
            onClick={checkIfPipelineRunning}
            secondary
          >
            Running status
          </Button>
        </Flex>
        <Flex alignItems="center">
          <Text>
            Hide
          </Text>
          <Spacing pr={1} />
          <ToggleSwitch
            checked={pipelineExecutionHidden}
            onCheck={togglePipelineExecution}
          />
        </Flex>
      </FlexContainer>


      {!pipelineExecutionHidden &&
        <>
          <Spacing mb={1} />
          <OutputContainerStyle noScrollbarTrackBackground>
            <CodeBlockStyle
              executedAndIdle
              hasError={false}
              selected
            >
              {truncatedPipelineMessages.map(({
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
      }
    </>
  );
}

export default PipelineExecution;
