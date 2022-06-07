import React, { useEffect, useRef, useState } from 'react';
import moment from 'moment';

import BarGraphHorizontal from '@components/charts/BarGraphHorizontal';
import FeatureType, {
  ColumnTypeEnum,
  COLUMN_TYPE_NUMBERS,
} from '@interfaces/FeatureType';
import FlexContainer from '@oracle/components/FlexContainer';
import HeatMap from '@components/charts/HeatMap';
import Histogram from '@components/charts/Histogram';
import LineSeries from '@components/charts/LineSeries';
import PieChart from '@components/charts/PieChart';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { ChartContainer, ChartRow } from './Overview';
import { ChartTypeEnum } from '@interfaces/InsightsType';
import { DATE_FORMAT } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  buildCorrelationsRowData,
  buildDistributionData,
  hasHighDistribution,
} from '@components/datasets/Insights/utils/data';
import { formatNumberLabel } from '@components/charts/utils/label';
import { formatPercent, numberWithCommas, roundNumber } from '@utils/string';
import {
  groupBy,
  indexBy,
  sortByKey,
} from '@utils/array';

type ColumnAnalysisProps = {
  column: string;
  features: FeatureType[];
  insights: any;
  statisticsByColumn: {
    [key: string]: number;
  };
  statisticsOverview: {
    [key: string]: any;
  };
};

function ColumnAnalysis({
  column,
  features,
  insights,
  statisticsByColumn,
  statisticsOverview: statisticsOverviewProp,
}: ColumnAnalysisProps) {
  const refContainer = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    setContainerWidth(refContainer?.current?.getBoundingClientRect()?.width);
  }, [
    refContainer,
    setContainerWidth,
  ]);

  const statisticsOverview = statisticsOverviewProp || {};
  const numberOfRows = statisticsOverview?.count;
  const featuresByUUID = indexBy(features, ({ uuid }) => uuid);
  const featuresByColumnType = groupBy(features, ({ columnType: ct }) => ct);
  const feature = featuresByUUID[column] || {};
  const numberOfValues = statisticsOverview?.[`${column}/count`];
  const numberOfUniqueValues = statisticsOverview?.[`${column}/count_distinct`];

  const statsRowData = [
    {
      columnValues: ['Number of values', numberWithCommas(numberOfValues)],
      uuid: 'count',
    },
    {
      columnValues: ['Unique values', numberWithCommas(numberOfUniqueValues)],
      uuid: 'count_distinct',
    },
    {
      columnValues: ['Missing values', formatPercent(statisticsOverview?.[`${column}/null_value_rate`])],
      uuid: 'null_value_rate',
    },
  ];

  const isBooleanType = ColumnTypeEnum.TRUE_OR_FALSE === feature.columnType;
  const isNumberType = COLUMN_TYPE_NUMBERS.includes(feature.columnType);
  const isCategoricalType = [
    ColumnTypeEnum.CATEGORY,
    ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY,
  ].includes(feature.columnType);

  if (isNumberType) {
    statsRowData.push(...[
      {
        columnValues: ['Minimum', numberWithCommas(statisticsOverview?.[`${column}/min`])],
        uuid: 'min',
      },
      {
        columnValues: ['Maximum', numberWithCommas(statisticsOverview?.[`${column}/max`])],
        uuid: 'max',
      },
      {
        columnValues: ['Average', numberWithCommas(statisticsOverview?.[`${column}/average`])],
        uuid: 'average',
      },
      {
        columnValues: ['Median', numberWithCommas(statisticsOverview?.[`${column}/median`])],
        uuid: 'median',
      },
      {
        columnValues: ['Total sum', numberWithCommas(statisticsOverview?.[`${column}/sum`])],
        uuid: 'sum',
      },
    ]);
  } else {
    const mode = statisticsOverview?.[`${column}/mode`];
    if (mode) {
      statsRowData.push({
        columnValues: ['Most frequent value', mode],
        uuid: 'mode',
      });
    }
  }

  const {
    charts,
    correlations = [],
    time_series: timeSeries,
  } = insights || {};

  const correlationsRowData = correlations?.length >= 1
    ? buildCorrelationsRowData([{
      correlations,
      feature,
    }])
    : null;
  const yLabels = [column];
  const heatmapData = [[1]];
  const highCorrelations = [];
  if (correlationsRowData) {
    correlationsRowData?.map(([, col, r], idx: number) => {
      yLabels.push(col);
      heatmapData.push([roundNumber(r)]);
    });
    correlationsRowData?.map((_, col, r) => {
      if (Math.abs(r[col][2]) > 0.5) {
        highCorrelations.push({
          'columnValues': [
            r[col][0]?.toString(),
            r[col][1]?.toString(),
            roundNumber(r[col][2])?.toString(),
          ],
        });
      }
    });
  }

  const histogramChart = charts?.find(({ type }) => ChartTypeEnum.HISTOGRAM === type);

  const {
    distribution = null,
    rangedWithUnusualDistribution = null,
    unusualDistribution = null,
  } = histogramChart
    ? buildDistributionData(
      histogramChart,
      featuresByUUID,
      {
        calculateAnomaly: ({
          y,
          yValuesAverage,
          yValuesStandardDeviation,
        }) => Math.abs(y.value - yValuesAverage) > 2 * yValuesStandardDeviation,
        feature,
        getYValue: ({ value }) => value,
      },
    )
    : {};

  const statisticsByColumnArray = Object.entries(statisticsByColumn || {}).map(([columnValue, uniqueValueCount]) => ({
    x: uniqueValueCount,
    y: columnValue,
  }));

  let distributionChart;
  if (distribution && !isBooleanType) {
    distributionChart = (
      <Histogram
        data={distribution.data.map(({
          hideRange,
          isUnusual,
          x,
          xLabel,
          y,
        }) => [
          xLabel,
          y.value,
          x.min,
          x.max,
          isUnusual,
          hideRange,
        ])}
        getBarColor={([,,,, isUnusual]) => isUnusual ? light.brand.wind400 : light.brand.wind300}
        height={UNIT * 50}
        key={column}
        large
        margin={{
          right: 2 * UNIT,
        }}
        noPadding
        renderTooltipContent={([, value, xLabelMin, xLabelMax,, hideRange]) => (
          <Text small>
            {hideRange && (
              <>
                Rows: {value}
                <br />
                Value: {xLabelMin}
              </>
            )}
            {!hideRange && (
              <>
                Rows: {value}
                <br />
                Range: {xLabelMin} - {xLabelMax}
              </>
            )}
          </Text>
        )}
        showAxisLabels
        showYAxisLabels
        showZeroes
        sortData={d => sortByKey(d, '[2]')}
        width={600}
      />
    );
  } else if (isCategoricalType) {
    const data = sortByKey(statisticsByColumnArray, 'x');

    distributionChart = (
      <BarGraphHorizontal
        data={data}
        height={Math.max(3 * data.length * UNIT, UNIT * 50)}
        renderTooltipContent={({ x, y }) => `${y} appears ${numberWithCommas(x)} times`}
        xNumTicks={2}
        ySerialize={({ y }) => y}
      />
    );
  } else if (isBooleanType && statisticsByColumn) {
    distributionChart = (
      <PieChart
        data={Object.entries(statisticsByColumn)}
        getX={([label, value]) => `${label} (${numberWithCommas(value)})`}
        getY={([, value]) => value}
        height={60 * UNIT}
      />
    );
  }

  let unusualDistributionTable;
  if (rangedWithUnusualDistribution?.length >= 1) {
    unusualDistributionTable = (
      <SimpleDataTable
        columnFlexNumbers={[1, 1, 1]}
        columnHeaders={[
          {
            label: 'Starting value',
          },
          {
            label: 'Ending value',
          },
          {
            label: 'Rows',
          },
        ]}
        noBorder
        rowGroupData={[
          {
            rowData: rangedWithUnusualDistribution.map(({ x, y }) => ({
              columnValues: [
                x.min,
                x.max,
                numberWithCommas(y.value),
              ],
              uuid: '',
            })),
          },
        ]}
        small
      />
    );
  } else if (unusualDistribution?.length >= 1) {
    unusualDistributionTable = (
      <SimpleDataTable
        columnFlexNumbers={[1, 1]}
        columnHeaders={[
          {
            label: 'Value',
          },
          {
            label: 'Rows',
          },
        ]}
        noBorder
        rowGroupData={[
          {
            rowData: unusualDistribution.map(({ x, y }) => ({
              columnValues: [
                x.min,
                numberWithCommas(y.value),
              ],
              uuid: '',
            })),
          },
        ]}
        small
      />
    );
  }
  else if (isCategoricalType) {
    const rowData = statisticsByColumnArray.reduce((acc, { x, y }) => {
      if (hasHighDistribution(x, numberOfValues, numberOfUniqueValues)) {
        acc.push({
          x,
          y,
        });
      }

      return acc;
    }, []);

    if (rowData.length >= 1) {
      unusualDistributionTable = (
        <SimpleDataTable
          columnFlexNumbers={[1, 1]}
          columnHeaders={[
            {
              label: 'Value',
            },
            {
              label: 'Rows',
            },
          ]}
          noBorder
          rowGroupData={[
            {
              rowData: sortByKey(rowData, 'x', {
                ascending: false,
              }).map(({ x, y }) => ({
                columnValues: [
                  y,
                  x,
                ],
                uuid: '',
              })),
            },
          ]}
          small
        />
      );
    }
  }

  const buildLineSeriesChart = ({
    legendNames,
    serializeY,
    x,
    xMetadata,
    y,
    yAxisLabel = 'Statistics',
  }) => {
    const data = x.map(({
      max: xMax,
      min: xMin,
    }, idx) => {
      const yCurrent = y[idx];

      return {
        x: ((xMax - xMin) / 2) + xMin,
        y: serializeY(yCurrent),
      };
    });

    console.log("legend names:", legendNames);
    console.log("data:", data);

    return (
      <LineSeries
        data={data}
        height={60 * UNIT}
        lineLegendNames={legendNames}
        margin={{
          bottom: 10 * UNIT,
        }}
        noCurve
        renderXTooltipContent={({ index }) => {
          const xCurrent = x[index];
          const {
            min: xMin,
            max: xMax,
          } = xCurrent;

          return (
            <Text small>
              {moment.unix(xMin).format(DATE_FORMAT)} - {moment.unix(xMax).format(DATE_FORMAT)}
            </Text>
          );
        }}
        renderYTooltipContent={({ y }, idx) => (
          <Text small>
            {legendNames[idx]}: {numberWithCommas(roundNumber(y[idx], 4))}
          </Text>
        )}
        xAxisLabel={xMetadata.label}
        xLabelFormat={ts => moment.unix(ts).format(DATE_FORMAT)}
        yAxisLabel={yAxisLabel}
        yLabelFormat={formatNumberLabel}
      />
    );
  };

  const timeSeriesChartsByDatetimeColumn = [];
  timeSeries?.filter(({ type }) => ChartTypeEnum.LINE_CHART === type)?.forEach(({
    x,
    x_metadata: xMetadata,
    y,
  }) => {
    const arr = [{
      chart: buildLineSeriesChart({
        legendNames: ['Rows', 'Unique values', '% missing values'],
        serializeY: ({
          count,
          count_distinct: countDistinct,
          null_value_rate: nullValueRate,
        }) => [
          count,
          countDistinct,
          nullValueRate,
        ],
        x,
        xMetadata,
        y,
      }),
      metric: 'count',
    }];

    if (isNumberType) {
      arr.push({
        chart: buildLineSeriesChart({
          legendNames: [
            'Minimum',
            'Maximum',
            'Average',
            'Median',
            // 'Total sum',
          ],
          serializeY: ({
            average,
            max: maxValue,
            median,
            min: minValue,
            // sum,
          }) => [
            minValue || 0,
            maxValue || 0,
            average || 0,
            median || 0,
            // sum,
          ],
          x,
          xMetadata,
          y,
        }),
        metric: 'sum',
      });
    } else if (isCategoricalType || isBooleanType) {
      const valueCounts = y?.[0]?.['value_counts'];

      if (valueCounts) {
        const keys = Object.keys(valueCounts);

        arr.push({
          chart: buildLineSeriesChart({
            legendNames: keys,
            serializeY: ({
              value_counts: vc,
            }) => keys.map(k => vc?.[k] || 0),
            x,
            xMetadata,
            y,
            yAxisLabel: 'Number of rows with value',
          }),
          metric: 'value_counts',
        });
      }
    }

    timeSeriesChartsByDatetimeColumn.push({
      charts: arr,
      column: xMetadata.label,
    });
  });

  return (
    <FlexContainer
      flexDirection="column"
      fullWidth
      justifyContent="center"
    >
      {distributionChart && (
        <ChartRow
          left={
            <ChartContainer
              title="Distribution of values"
            >
              {distributionChart}
            </ChartContainer>
          }
          right={
            <ChartContainer
              noPadding={isBooleanType || !!unusualDistributionTable}
              title="Values with unusual distribution"
            >
              {isBooleanType && (
                <SimpleDataTable
                  columnFlexNumbers={[1, 1, 1]}
                  columnHeaders={[
                    {
                      label: 'Value',
                    },
                    {
                      label: 'Number of rows',
                    },
                    {
                      label: '% of rows',
                    },
                  ]}
                  noBorder
                  rowGroupData={[
                    {
                      rowData: sortByKey(
                        Object.entries(statisticsByColumn),
                        ([, v]) => v,
                        { ascending: false },
                      ).map(([k, v]) => ({
                        columnValues: [
                          k,
                          numberWithCommas(v),
                          formatPercent(v / numberOfRows),
                        ],
                        uuid: v,
                      })),
                    },
                  ]}
                  small
                />
              )}
              {!isBooleanType && (
                <>
                  {!unusualDistributionTable && (
                    <Text>
                      There is no unusual distribution.
                    </Text>
                  )}

                  {unusualDistributionTable}
                </>
              )}
            </ChartContainer>
          }
        />
      )}

      {timeSeriesChartsByDatetimeColumn.length >= 1 &&
        timeSeriesChartsByDatetimeColumn.map(({
          column: datetimeColumn,
          charts: timeseriesCharts,
        }, idx) => (
          <ChartRow
            key={idx}
            left={
              <ChartContainer
                title={`Statistics by date, column: ${datetimeColumn}`}
              >
                {timeseriesCharts.map(({
                  chart,
                  metric,
                }, idx) => (
                  <Spacing key={idx} mb={4}>
                    {chart}
                  </Spacing>
                ))}
              </ChartContainer>
            }
          />
        ))
      }

      {correlationsRowData?.length >= 1 && (
        <ChartRow
          left={
            <ChartContainer
              title="Correlations"
            >
              <HeatMap
                countMidpoint={0}
                data={heatmapData}
                height={UNIT * 8 * yLabels.length}
                minCount={-1}
                xLabels={[column]}
                yLabels={yLabels}
              />
            </ChartContainer>
          }
          right={
            <ChartContainer
              noPadding={!!correlationsRowData}
              title="Values with high correlation"
            >
              { highCorrelations.length > 0 ? (
                <SimpleDataTable
                  columnFlexNumbers={[1, 1, 1]}
                  columnHeaders={[
                    {
                      label: 'Column',
                    },
                    {
                      label: 'Related column',
                    },
                    {
                      label: 'Correlation',
                    },
                  ]}
                  noBorder
                  rowGroupData={[
                    {
                      rowData: highCorrelations,
                    },
                  ]}
                  small
                />
              ) : (
                <>
                  <Spacing mb={1} ml={1} mt={1}>
                    <Text>
                      There are no values with high correlation.
                    </Text>
                  </Spacing>
                  <SimpleDataTable
                    columnFlexNumbers={[1, 1, 1]}
                    columnHeaders={[]}
                    noBorder
                    rowGroupData={[]}
                    small
                  />
                </>
              )}
            </ChartContainer>
          }
        />
      )}
    </FlexContainer>
  );
}

export default ColumnAnalysis;
