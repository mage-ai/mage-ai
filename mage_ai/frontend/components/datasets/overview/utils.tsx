import BarGraphHorizontal from '@components/charts/BarGraphHorizontal';
import Histogram from '@components/charts/Histogram';
import PieChart from '@components/charts/PieChart';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import {
  CATEGORICAL_TYPES,
  DATE_TYPES,
  HUMAN_READABLE_MAPPING,
  METRICS_KEYS,
  METRICS_SORTED_MAPPING,
  NUMBER_TYPES,
  PERCENTAGE_KEYS,
  RATIO_KEYS,
  STAT_KEYS,
  WARN_KEYS,
} from '../constants';
import { COLUMN_TYPE_ICON_MAPPING } from '@components/constants';
import { ChartTypeEnum } from '@interfaces/InsightsType';
import { ColumnTypeEnum } from '@interfaces/FeatureType';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildDistributionData } from '@components/datasets/Insights/utils/data';
import { getPercentage } from '@utils/number';
import { numberWithCommas } from '@utils/string';
import { sortByKey } from '@utils/array';

export const COLUMN_HEADER_CHART_HEIGHT = UNIT * 12;

export function createMetricsSample(statistics, colTypes) {
  const stats = Object.keys(statistics);
  const types = Object.values(colTypes);
  const metricRows = Array(METRICS_KEYS.length).fill(0);
  const totalCells = (statistics?.count === 0 || types?.length === 0)
    ? 1 : statistics?.count * types?.length;

  stats.map((key) => {
    if (METRICS_KEYS.includes(key)) {
      let bar: any[] = [false];
      let value = statistics[key];
      const order = HUMAN_READABLE_MAPPING[key];
      const index = METRICS_SORTED_MAPPING[key];
      if (PERCENTAGE_KEYS.includes(key)) {
        bar = [true, value * 100];
        value = getPercentage(value);
      } else if (RATIO_KEYS.includes(key)) {
        value = `${value} (${getPercentage(value / totalCells)})`;
      }
      metricRows[index] = {
        columnValues: [order, value, bar],
      };
    }
  });

  return {
    rowData: metricRows,
  };
}

export function createStatisticsSample(statistics, colTypes) {
  const stats = Object.keys(statistics);
  const types = Object.values(colTypes);
  const total = types.length;
  const rowData = [];

  rowData.push({
    columnValues: ['Column count', total],
  });

  stats.map((key) => {
    if (STAT_KEYS.includes(key)) {
      const name = HUMAN_READABLE_MAPPING[key];
      let value = statistics[key];
      if (WARN_KEYS.includes(key)) {
        if (total !== 0) {
          value = `${value} (${getPercentage(value / total)})`;
        } else {
          value = '0 (0%)';
        }
      }
      rowData.push({
        columnValues: [name, value],
      });
    }
  });

  let countCategory = 0;
  let countNumerical = 0;
  let countTimeseries = 0;

  types.map((val: string) => {
    if (CATEGORICAL_TYPES.includes(val)) {
      countCategory += 1;
    }
    else if (NUMBER_TYPES.includes(val)) {
      countNumerical += 1;
    } else if (DATE_TYPES.includes(val)) {
      countTimeseries += 1;
    }
  });

  if (total !== 0) {
    rowData.push({
      columnValues: ['Categorical Features', `${countCategory} (${getPercentage(countCategory / total)})`],
    },{
      columnValues: ['Numerical Features', `${countNumerical} (${getPercentage(countNumerical / total)})`],
    },{
      columnValues: ['Datetime Features', `${countTimeseries} (${getPercentage(countTimeseries / total)})`],
    });
  } else {
    rowData.push({
      columnValues: ['Categorical Features', '0 (0%)'],
    },{
      columnValues: ['Numerical Features', '0 (0%)'],
    },{
      columnValues: ['Datetime Features', '0 (0%)'],
    });
  }
  return { rowData };
}

export function buildRenderColumnHeader({
  columnTypes,
  columns,
  insightsByFeatureUUID,
  insightsOverview,
  statistics,
}) {
  return (cell, columnIndex, { width: columnWidth }) => {
    const columnUUID = columns[columnIndex];
    const columnType = columnTypes[columnUUID];
    const ColumnTypeIcon = COLUMN_TYPE_ICON_MAPPING[columnType];

    const {
      charts,
    } = insightsByFeatureUUID[columnUUID];

    const {
      time_series: timeSeries,
    } = insightsOverview;

    const timeSeriesData = [];

    timeSeries?.forEach((tsChart) => {
      const {
        distribution,
      } = buildDistributionData(
        tsChart,
        {},
        {
          feature: {
            'columnType': columnType,
            'uuid': columnUUID,
          },
        },
      );
      timeSeriesData.push(distribution);
    });


    const histogramChart = charts?.find(({ type }) => ChartTypeEnum.HISTOGRAM === type);
    const timeSeriesHistograms = timeSeriesData.map(({
      data,
      columnUUID,
    }) => (
      <Histogram
        data={data.map(({
          x,
          xLabel,
          xLabelMax,
          xLabelMin,
          y,
        }) => [
          xLabel,
          y.count,
          xLabelMin,
          xLabelMax,
          x.min,
          x.max,
        ])}
        getBarColor={([]) => light.brand.wind300}
        height={COLUMN_HEADER_CHART_HEIGHT}
        key={columnUUID}
        large
        margin={{
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
        }}
        renderTooltipContent={([, count, xLabelMin, xLabelMax]) => (
          <Text small>
            Rows: {count}
            <br />
            Start: {xLabelMin}
            <br />
            End: {xLabelMax}
          </Text>
        )}
        sortData={d => sortByKey(d, '[4]')}
      />
    ));
    const {
      distribution = null,
    } = histogramChart
      ? buildDistributionData(
        histogramChart,
        {},
        {
          feature: {
            columnType: columnType,
            uuid: columnUUID,
          },
          getYValue: ({ value }) => value,
        },
      )
      : {};

    const statisticsByColumn = statistics?.[`${columnUUID}/value_counts`];
    const statisticsByColumnArray = Object
      .entries(statisticsByColumn || {})
      .map(([columnValue, uniqueValueCount]) => ({
        x: uniqueValueCount,
        y: columnValue,
      }));

    const isBooleanType = ColumnTypeEnum.TRUE_OR_FALSE === columnType;
    const isDatetimeType = ColumnTypeEnum.DATETIME === columnType;
    const isCategoricalType = [
      ColumnTypeEnum.CATEGORY,
      ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY,
    ].includes(columnType);

    let distributionChart;
    if (isDatetimeType) {
      distributionChart = timeSeriesHistograms;
    }
    else if (distribution && !isBooleanType) {
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
          height={COLUMN_HEADER_CHART_HEIGHT}
          margin={{
            bottom: 0,
            left: 0,
            right: 0,
            top: 0,
          }}
          renderTooltipContent={([, value, xLabelMin, xLabelMax,, hideRange]) => (
            <p>
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
            </p>
          )}
          sortData={d => sortByKey(d, '[2]')}
          width={columnWidth - (UNIT * 2)}
        />
      );
    } else if (isCategoricalType) {
      const data = sortByKey(sortByKey(statisticsByColumnArray, 'x', {
        ascending: false,
      }).slice(0, 5), 'x');

      distributionChart = (
        <BarGraphHorizontal
          data={data}
          height={COLUMN_HEADER_CHART_HEIGHT}
          margin={{
            bottom: 0,
            left: 0,
            right: 20,
            top: 0,
          }}
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
          height={COLUMN_HEADER_CHART_HEIGHT}
          textColor={light.monotone.black}
        />
      );
    }

    return (
      <div
        style={{
          padding: UNIT,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            marginBottom: UNIT,
          }}
        >
          {ColumnTypeIcon && <ColumnTypeIcon size={UNIT * 2} />}

          <div
            style={{
              marginLeft: UNIT * 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: columnWidth - (UNIT * 4.5),
            }}
          >
            {columns[columnIndex]}
          </div>
        </div>

        {distributionChart}
        {!distributionChart && <div style={{ height: COLUMN_HEADER_CHART_HEIGHT }} />}
      </div>
    );
  };
}
