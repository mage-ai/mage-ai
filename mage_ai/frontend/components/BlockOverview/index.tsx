import HeatMap from '@components/charts/HeatMap';
import { ChartContainer, ChartRow } from '@components/datasets/Insights/Overview';
import FlexContainer from '@oracle/components/FlexContainer';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildHeatmapData } from './utils';

export type BlockOverviewProps = {
  insightsOverview: any;
};

function BlockOverview({
  insightsOverview,
}: BlockOverviewProps) {

  const {
    correlations = [],
  } = insightsOverview;

  const { heatmapData, xyLabels } = buildHeatmapData(correlations);

  return (
    <FlexContainer responsive>
      {correlations && heatmapData?.length >= 1 && (
        <ChartContainer title="Correlations">
          <HeatMap
            countMidpoint={0}
            data={heatmapData}
            height={UNIT * 8 * xyLabels.length}
            minCount={-1}
            xLabels={xyLabels}
            yLabels={xyLabels}
          />
        </ChartContainer>
      )}
    </FlexContainer>
  );
}

export default BlockOverview;
