import { createRef, useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import ChartBlock, { ChartPropsShared } from '@components/ChartBlock';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import Row from '@components/shared/Grid/Row';
import { UNIT } from '@oracle/styles/units/spacing';

export type ChartsPropsShared = {
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  onChangeChartBlock: (uuid: string, value: string) => void;
  selectedBlock: BlockType;
  widgets: BlockType[];
} & ChartPropsShared;

function Charts({
  blockRefs,
  blocks,
  chartRefs,
  deleteWidget,
  messages,
  onChangeChartBlock,
  runBlock,
  runningBlocks,
  savePipelineContent,
  selectedBlock,
  setAnyInputFocused,
  setErrors,
  setSelectedBlock,
  setTextareaFocused,
  textareaFocused,
  updateWidget,
  widgets,
  width,
  ...props
}: ChartsPropsShared) {
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

  return (
    <FlexContainer
      flexDirection="column"
      fullWidth
    >
      <Row
        fullHeight
        style={{
          marginLeft: UNIT * 0.5,
          marginRight: UNIT * 0.5,
        }}
      >
        {widgets?.map((block: BlockType) => {
          const {
            uuid,
          } = block;
          const runningBlock = runningBlocksByUUID[uuid];
          const executionState = runningBlock
            ? (runningBlock.priority === 0
              ? ExecutionStateEnum.BUSY
              : ExecutionStateEnum.QUEUED
             )
            : ExecutionStateEnum.IDLE;

          chartRefs.current[uuid] = createRef();

          return (
            <ChartBlock
              {...props}
              block={block}
              blockRefs={blockRefs}
              blocks={blocks}
              chartRefs={chartRefs}
              deleteWidget={deleteWidget}
              executionState={executionState}
              key={uuid}
              messages={messages[uuid]}
              onChangeContent={(value: string) => onChangeChartBlock(uuid, value)}
              ref={chartRefs.current[uuid]}
              runBlock={runBlock}
              runningBlocks={runningBlocks}
              savePipelineContent={savePipelineContent}
              selected={selectedBlock?.uuid === uuid}
              setAnyInputFocused={setAnyInputFocused}
              setErrors={setErrors}
              setSelectedBlock={setSelectedBlock}
              setTextareaFocused={setTextareaFocused}
              textareaFocused={textareaFocused}
              updateWidget={updateWidget}
              width={width}
            />
          );
        })}
      </Row>
      <div style={{ height: '80vh' }} />
    </FlexContainer>
  );
}

export default Charts;
