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
import { OutputContainerStyle, OutputHeaderStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { removeKeyboardFocus } from '@context/shared/utils';
import { SampleDataType } from '@interfaces/BlockType';
import Image from 'next/image';

export type PipelineExecutionProps = {
  cancelPipeline: () => void;
  checkIfPipelineRunning: () => void;
  containerHeight?: number;
  executePipeline: () => void;
  isPipelineExecuting: boolean;
  outputContainerRef?: React.RefObject<HTMLDivElement>;
  pipelineExecutionHidden: boolean;
  pipelineMessages: KernelOutputType[];
  setPipelineExecutionHidden: (pipelineExecutionHidden: boolean) => void;
  setTreeHidden?: (hidden: boolean) => void;
  treeHidden?: boolean;
};

function PipelineExecution({
  cancelPipeline,
  checkIfPipelineRunning,
  containerHeight,
  executePipeline,
  isPipelineExecuting,
  outputContainerRef,
  pipelineExecutionHidden,
  pipelineMessages,
  setPipelineExecutionHidden,
  setTreeHidden,
  treeHidden,
}: PipelineExecutionProps) {
  const numberOfMessages = useMemo(() => pipelineMessages?.length || 0, [pipelineMessages]);
  const truncatedPipelineMessages = useMemo(() => (
    numberOfMessages > 100 ? pipelineMessages.slice(-100) : pipelineMessages
  ), [numberOfMessages, pipelineMessages]);

  // When the pipeline starts executing, the execution button gets disabled.
  // Disabled buttons are not focusable, so manually remove the focus here.
  const handleExecutePipeline = useCallback(() => {
    removeKeyboardFocus();
    executePipeline();
  }, [executePipeline]);
  const handleCancelPipeline = useCallback(() => {
    removeKeyboardFocus();
    cancelPipeline();
  }, [cancelPipeline]);

  const togglePipelineExecution = useCallback(() => {
    const val = !pipelineExecutionHidden;
    // Don't allow hiding output when tree is already hidden
    if (!val || !treeHidden) {
      setPipelineExecutionHidden(val);
      set(LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN, val);
    }
  }, [
    pipelineExecutionHidden,
    setPipelineExecutionHidden,
    treeHidden,
  ]);

  return (
    <>
      <OutputHeaderStyle>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex>
            <Button
              beforeIcon={<PlayButton inverted size={UNIT * 2}/>}
              compact={isPipelineExecuting}
              disabled={isPipelineExecuting}
              loading={isPipelineExecuting}
              onClick={handleExecutePipeline}
              success
            >
              <Text
                bold
                inverted
                noWrapping
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
                  onClick={handleCancelPipeline}
                  success
                >
                  <Text
                    bold
                    inverted
                    noWrapping
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
              <Text
                bold
                noWrapping
              >
                Running status
              </Text>
            </Button>
          </Flex>
          <Flex alignItems="center">
            {setTreeHidden && (
              <>
                <Text>
                  Tree
                </Text>
                <Spacing mr={1} />
                <span
                  data-testid="tree-toggle"
                  style={pipelineExecutionHidden && !treeHidden ? {
                    opacity: 0.4,
                    pointerEvents: 'none',
                  } : {}}
                >
                  <ToggleSwitch
                    checked={!treeHidden}
                    onCheck={() => {
                      const newHidden = !treeHidden;
                      if (!newHidden || !pipelineExecutionHidden) {
                        setTreeHidden(newHidden);
                      }
                    }}
                  />
                </span>
                <Spacing ml={2} />
              </>
            )}
            <Text>
              Output
            </Text>
            <Spacing mr={1} />
            <span
              data-testid="output-toggle"
              style={treeHidden && !pipelineExecutionHidden ? {
                opacity: 0.4,
                pointerEvents: 'none',
              } : {}}
            >
              <ToggleSwitch
                checked={!pipelineExecutionHidden}
                onCheck={togglePipelineExecution}
              />
            </span>
          </Flex>
        </FlexContainer>
      </OutputHeaderStyle>


      {!pipelineExecutionHidden &&
        <>
          <Spacing mb={1} />
          <OutputContainerStyle height={containerHeight} noScrollbarTrackBackground ref={outputContainerRef}>
            <CodeBlockStyle
              executedAndIdle
              hasError={false}
              selected
            >
              {truncatedPipelineMessages.map(({
                data: dataInit,
                type: dataType,
              }: KernelOutputType, idx: number) => {
                let dataArray: (string | SampleDataType)[] = [];
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
                        <Image
                          alt={`Image ${idx} from code output`}
                          layout="responsive"
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
