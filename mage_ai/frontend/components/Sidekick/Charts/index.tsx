import { useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import ChartBlock, { ChartPropsShared } from '@components/ChartBlock';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';

export type ChartsPropsShared = {
  fetchWidgets: () => void;
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
  deleteWidget,
  fetchWidgets,
  messages,
  onChangeChartBlock,
  runBlock,
  runningBlocks,
  savePipelineContent,
  selectedBlock,
  setSelectedBlock,
  setTextareaFocused,
  textareaFocused,
  updateWidget,
  widgets,
  width,
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

        return (
          <ChartBlock
            block={block}
            blockRefs={blockRefs}
            blocks={blocks}
            deleteWidget={deleteWidget}
            executionState={executionState}
            key={uuid}
            messages={messages[uuid]}
            onChangeContent={(value: string) => onChangeChartBlock(uuid, value)}
            runBlock={runBlock}
            runningBlocks={runningBlocks}
            savePipelineContent={savePipelineContent}
            selected={selectedBlock?.uuid === uuid}
            setSelectedBlock={setSelectedBlock}
            setTextareaFocused={setTextareaFocused}
            textareaFocused={textareaFocused}
            updateWidget={updateWidget}
            width={width}
          />
        );
      })}

      <div style={{ height: '80vh' }} />
    </FlexContainer>
  );
}

export default Charts;
