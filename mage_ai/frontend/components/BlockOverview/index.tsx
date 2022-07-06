import BarGraphHorizontal from '@components/charts/BarGraphHorizontal';
import FeatureType from '@interfaces/FeatureType';
import FlexContainer from '@oracle/components/FlexContainer';
import HeatMap from '@components/charts/HeatMap';
import { ChartContainer } from '@components/datasets/Insights/Overview';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildHeatmapData, buildNullValueData } from './utils';
import { formatPercent } from '@utils/string';

export type BlockOverviewProps = {
  features: FeatureType[];
  insightsOverview: any;
  statistics: any;
};

function BlockOverview({
  features,
  insightsOverview,
  statistics,
}: BlockOverviewProps) {

  const {
    correlations = [],
  } = insightsOverview;

  const { heatmapData, xyLabels } = buildHeatmapData(correlations);
  const nullValueData = buildNullValueData(features, statistics);

  return (
    <FlexContainer flexDirection="column">
      {nullValueData?.length >= 1 && (
        <ChartContainer
          title="Data completion"
        >
          <BarGraphHorizontal
            data={nullValueData.map(({ feature, value }) => ({
              x: value,
              y: feature.uuid,
            }))}
            height={Math.max(3 * nullValueData.length * UNIT, UNIT * 50)}
            renderTooltipContent={({ x }) => `${formatPercent(x)} of rows have a value`}
            xNumTicks={2}
            ySerialize={({ y }) => y}
          />
        </ChartContainer>
      )}

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
