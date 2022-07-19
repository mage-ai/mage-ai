import BlockType from '@interfaces/BlockType';
import ChartBlock from '@components/ChartBlock';
import FlexContainer from '@oracle/components/FlexContainer';

export type ChartPropsShared = {
  fetchWidgets: () => void;
  onChangeChartBlock: (uuid: string, value: string) => void;
  savePipelineContent: () => void;
  updateWidget: (block: BlockType) => void;
  widgets: BlockType[];
};

type ChartsProps = {
  blocks: BlockType[];
};

function Charts({
  blocks,
  fetchWidgets,
  onChangeChartBlock,
  savePipelineContent,
  updateWidget,
  widgets,
}: ChartsProps) {
  return (
    <FlexContainer
      flexDirection="column"
      fullWidth
    >
      {widgets?.map((block: BlockType) => (
        <ChartBlock
          block={block}
          blocks={blocks}
          key={block.uuid}
          onChangeContent={(value: string) => onChangeChartBlock(block.uuid, value)}
          updateWidget={updateWidget}
        />
      ))}
    </FlexContainer>
  );
}

export default Charts;
