import BlockType from '@interfaces/BlockType';
import ChartBlock from '@components/ChartBlock';
import FlexContainer from '@oracle/components/FlexContainer';

type ChartsProps = {
  blocks: BlockType[];
  fetchWidgets: () => void;
  onChangeChartBlock: (uuid: string, value: string) => void;
  savePipelineContent: () => void;
  widgets: BlockType[];
};

function Charts({
  blocks,
  fetchWidgets,
  onChangeChartBlock,
  savePipelineContent,
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
        />
      ))}
    </FlexContainer>
  );
}

export default Charts;
