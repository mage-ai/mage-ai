import BlockType from '@interfaces/BlockType';
import ChartBlock from '@components/ChartBlock';
import FlexContainer from '@oracle/components/FlexContainer';

type ChartsProps = {
  fetchWidgets: () => void;
  widgets: BlockType[];
};

function Charts({
  fetchWidgets,
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
          key={block.uuid}
        />
      ))}
    </FlexContainer>
  );
}

export default Charts;
