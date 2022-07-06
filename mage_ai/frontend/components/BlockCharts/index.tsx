import BarGraphHorizontal from '@components/charts/BarGraphHorizontal';
import FeatureType from '@interfaces/FeatureType';
import FlexContainer from '@oracle/components/FlexContainer';
import HeatMap from '@components/charts/HeatMap';
import RowDataTable from '@oracle/components/RowDataTable';
import Spacing from '@oracle/elements/Spacing';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  buildHeatmapData,
  buildNullValueData,
  buildUniqueValueData,
  buildValueDistributionData,
} from './utils';
import { formatPercent } from '@utils/string';

export type BlockOverviewProps = {
  features: FeatureType[];
  insightsOverview: any;
  statistics: any;
};

function BlockGraphs({
  features,
  insightsOverview,
  statistics,
}: BlockOverviewProps) {

  const {
    correlations = [],
  } = insightsOverview;

  const { heatmapData, xyLabels } = buildHeatmapData(correlations);
  const nullValueData = buildNullValueData(features, statistics);
  const uniqueValueData = buildUniqueValueData(features, statistics);
  const distributionData = buildValueDistributionData(features, statistics);

  return (
    <Spacing p={2}>
      <FlexContainer flexDirection="column">
        {nullValueData?.length >= 1 && (
          <RowDataTable
            headerTitle="Data completion"
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
          </RowDataTable>
        )}

        {uniqueValueData?.length >= 1 && (
          <RowDataTable
            headerTitle="Number of unique values"
          >
            <BarGraphHorizontal
              data={uniqueValueData.map(({ feature, value }) => ({
                x: value,
                y: feature.uuid,
              }))}
              height={Math.max(3 * nullValueData.length * UNIT, UNIT * 50)}
              renderTooltipContent={({ x }) => `${x} unique values`}
              xNumTicks={2}
              ySerialize={({ y }) => y}
            />
          </RowDataTable>
        )}

        {distributionData.length >= 1 && (
          <RowDataTable
            headerTitle="Distribution of values"
          >
            <BarGraphHorizontal
              data={distributionData.map(({
                feature,
                percentage,
                value,
              }) => ({
                feature,
                value,
                x: percentage,
                y: feature.uuid,
              }))}
              height={Math.max(3 * distributionData.length * UNIT, UNIT * 50)}
              renderTooltipContent={({
                value,
                x,
              }) =>
                `${value} is ${formatPercent(x)} of all rows`
              }
              xNumTicks={2}
              ySerialize={({ y }) => y}
            />
          </RowDataTable>
        )}

        {correlations && heatmapData?.length >= 1 && (
          <RowDataTable
            headerTitle="Correlations"
          >
            <HeatMap
              countMidpoint={0}
              data={heatmapData}
              height={UNIT * 8 * xyLabels.length}
              minCount={-1}
              xLabels={xyLabels}
              yLabels={xyLabels}
            />
          </RowDataTable>
        )}
      </FlexContainer>
    </Spacing>
  );
}

export default BlockGraphs;
