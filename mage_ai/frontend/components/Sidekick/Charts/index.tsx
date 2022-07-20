import BlockType from '@interfaces/BlockType';
import ChartBlock, { ChartPropsShared } from '@components/ChartBlock';
import FlexContainer from '@oracle/components/FlexContainer';

export type ChartsPropsShared = {
  fetchWidgets: () => void;
  onChangeChartBlock: (uuid: string, value: string) => void;
  updateWidget: (block: BlockType) => void;
  widgets: BlockType[];
} & ChartPropsShared;

function Charts({
  blocks,
  deleteWidget,
  fetchWidgets,
  onChangeChartBlock,
  runBlock,
  savePipelineContent,
  setSelectedBlock,
  updateWidget,
  widgets,
}: ChartsPropsShared) {
  return (
    <FlexContainer
      flexDirection="column"
      fullWidth
    >
      {widgets?.map((block: BlockType) => (
        <ChartBlock
          block={block}
          blocks={blocks}
          deleteWidget={deleteWidget}
          key={block.uuid}
          onChangeContent={(value: string) => onChangeChartBlock(block.uuid, value)}
          runBlock={runBlock}
          savePipelineContent={savePipelineContent}
          setSelectedBlock={setSelectedBlock}
          updateWidget={updateWidget}
        />
      ))}
    </FlexContainer>
  );
}

export default Charts;
