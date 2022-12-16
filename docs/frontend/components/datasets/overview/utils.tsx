import NextLink from 'next/link';

import BarGraphHorizontal from '@components/charts/BarGraphHorizontal';
import Flex from '@oracle/components/Flex';
import Histogram from '@components/charts/Histogram';
import Link from '@oracle/elements/Link';
import PieChart from '@components/charts/PieChart';
import SuggestionType from '@interfaces/SuggestionType';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';

import {
  CATEGORICAL_TYPES,
  DATE_TYPES,
  DISTRIBUTION_COLUMNS,
  DISTRIBUTION_STATS,
  HUMAN_READABLE_MAPPING,
  METRICS_KEYS,
  METRICS_RATE_KEY_MAPPING,
  METRICS_SORTED_MAPPING,
  METRICS_SUCCESS_DIRECTION_MAPPING,
  METRICS_WARNING_MAPPING,
  NUMBER_TYPES,
  PERCENTAGE_KEYS,
  STAT_KEYS,
} from '../constants';
import { COLUMN_TYPE_ICON_MAPPING } from '@components/constants';
import { ChartTypeEnum } from '@interfaces/InsightsType';
import { ColumnTypeEnum, COLUMN_TYPE_HUMAN_READABLE_MAPPING } from '@interfaces/FeatureType';
import { StatRow } from '../StatsTable';
import { TAB_VISUALIZATIONS } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildDistributionData } from '@components/datasets/Insights/utils/data';
import { calculateChange, transformNumber } from '@utils/number';
import { createDatasetTabRedirectLink } from '@components/utils';
import { numberWithCommas } from '@utils/string';
import { sortByKey } from '@utils/array';

export const COLUMN_HEADER_CHART_HEIGHT = UNIT * 12;

export function createMetricsSample({
  latestStatistics,
  versionStatistics,
}) {
  const stats = Object.keys(latestStatistics);
  const metricRows = Array(METRICS_KEYS.length).fill(0);

  stats.forEach((key) => {
    if (METRICS_KEYS.includes(key)) {
      const name = HUMAN_READABLE_MAPPING[key];
      let value = latestStatistics[key];
      let rate = value;
      let progress = false;
      let columnFlexNumbers = [2, 3];
      const index = METRICS_SORTED_MAPPING[key];
      const successDirection = METRICS_SUCCESS_DIRECTION_MAPPING[key];
      const warning = METRICS_WARNING_MAPPING[key];
      let change = versionStatistics
        ? latestStatistics[key] - versionStatistics?.[key]
        : 0;

      if (PERCENTAGE_KEYS.includes(key)){
        progress = true;
        columnFlexNumbers = [2, 1, 2];
      } else if (key in METRICS_RATE_KEY_MAPPING) {
        value = transformNumber(value, 0);
        const rateKey = METRICS_RATE_KEY_MAPPING[key];
        rate = latestStatistics[rateKey];
        change = versionStatistics
          ? (latestStatistics[rateKey] ?? 0) - (versionStatistics?.[rateKey] ?? 0)
          : 0;
      }

      const qualityMetricObj: StatRow = {
        change,
        columnFlexNumbers,
        name,
        progress,
        rate,
        successDirection,
        warning,
      };
      if (!PERCENTAGE_KEYS.includes(key)) {
        qualityMetricObj.value = value;
      }

      metricRows[index] = qualityMetricObj;
    }
  });
  return metricRows;
}

export function getColumnTypeCounts(
  columnTypes: string[],
): {
  countCategory?: number,
  countDatetime?: number,
  countNumerical?: number,
} {
  if (typeof columnTypes === 'undefined') {
    return {};
  }

  let countCategory = 0;
  let countDatetime = 0;
  let countNumerical = 0;

  columnTypes.forEach((val: string) => {
    if (CATEGORICAL_TYPES.includes(val)) {
      countCategory += 1;
    } else if (NUMBER_TYPES.includes(val)) {
      countNumerical += 1;
    } else if (DATE_TYPES.includes(val)) {
      countDatetime += 1;
    }
  });

  return {
    countCategory,
    countDatetime,
    countNumerical,
  };
}

export function getColumnSuggestions(
  allSuggestions: SuggestionType[],
  selectedColumn: string,
) {
  return allSuggestions?.reduce((acc, s) => {
    const { action_payload: { action_arguments: aa } } = s;

    if (aa?.includes(selectedColumn)) {
      acc.push({
        ...s,
        action_payload: {
          ...s.action_payload,
          action_arguments: [selectedColumn],
        },
      });
    }

    return acc;
  }, []);
}

export function createStatisticsSample({
  latestColumnTypes = {},
  latestStatistics,
  versionColumnTypes,
  versionStatistics,
}) {
  const currentStats = Object.keys(latestStatistics);
  const currentTypes: string[] = Object.values(latestColumnTypes);
  const previousTypes: string[] = versionColumnTypes
    ? Object.values(versionColumnTypes)
    : undefined;
  const currentTotal = currentTypes.length;
  const previousColumnTotal = previousTypes?.length;
  const rowData: StatRow[] = [];

  rowData.push({
    change: calculateChange(currentTotal, previousColumnTotal),
    name: 'Column count',
    successDirection: METRICS_SUCCESS_DIRECTION_MAPPING.column_count,
    value: numberWithCommas(currentTotal),
  });

  currentStats.forEach((key) => {
    if (STAT_KEYS.includes(key)) {
      const name = HUMAN_READABLE_MAPPING[key];
      const currentValue = latestStatistics[key];
      const previousValue = versionStatistics?.[key];
      const warning = METRICS_WARNING_MAPPING[key];
      const change = calculateChange((currentValue ?? 0), previousValue);
      rowData.push({
        change,
        name,
        successDirection: METRICS_SUCCESS_DIRECTION_MAPPING[key],
        value: numberWithCommas(currentValue),
        warning,
      });
    }
  });

  const {
    countCategory: currentCountCategory,
    countDatetime: currentCountDatetime,
    countNumerical: currentCountNumerical,
  } = getColumnTypeCounts(currentTypes);
  const {
    countCategory: previousCountCategory,
    countDatetime: previousCountDatetime,
    countNumerical: previousCountNumerical,
  } = getColumnTypeCounts(previousTypes);

  rowData.push({
    change: calculateChange(currentCountCategory, previousCountCategory),
    name: 'Categorical Features',
    rate: currentCountCategory / currentTotal,
    value: numberWithCommas(currentCountCategory),
  }, {
    change: calculateChange(currentCountNumerical, previousCountNumerical),
    name: 'Numerical Features',
    rate: currentCountNumerical / currentTotal,
    value: numberWithCommas(currentCountNumerical),
  }, {
    change: calculateChange(currentCountDatetime, previousCountDatetime),
    name: 'Datetime Features',
    rate: currentCountDatetime / currentTotal,
    value: numberWithCommas(currentCountDatetime),
  });

  return rowData;
}

export function buildRenderColumnHeader({
  columnTypes,
  columns,
  insightsByFeatureUUID,
  insightsOverview,
  noColumnLinks = false,
  statistics,
}) {
  return (cell, columnIndex, { width: columnWidth }) => {
    const columnUUID = columns[columnIndex];
    const columnType = columnTypes[columnUUID];
    const ColumnTypeIcon = COLUMN_TYPE_ICON_MAPPING[columnType];

    const {
      charts,
    } = insightsByFeatureUUID[columnUUID] || {};

    const {
      time_series: timeSeries,
    } = insightsOverview;

    const datetimeColumns = columns.filter((col) => (
      columnTypes[col] === ColumnTypeEnum.DATETIME
    ));

    const timeSeriesData = timeSeries?.map((tsChart) => {
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
      return distribution;
    });

    const timeSeriesHistograms = {};

    timeSeriesData?.forEach(({ data }, idx) => {
      timeSeriesHistograms[datetimeColumns[idx]] = (
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
            <p>
              Rows: {count}
              <br />
              Start: {xLabelMin}
              <br />
              End: {xLabelMax}
            </p>
          )}
          sortData={d => sortByKey(d, '[4]')}
        />
      );
    });

    const histogramChart = charts?.find(({ type }) => ChartTypeEnum.HISTOGRAM === type);

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

    const distributionName = DISTRIBUTION_STATS[columnType] || DISTRIBUTION_STATS.default;
    const statisticsByColumn = statistics?.[`${columnUUID}/${distributionName}`];

    const statisticsByColumnArray = Object
      .entries(statisticsByColumn || {})
      .map(([columnValue, uniqueValueCount]) => ({
        x: uniqueValueCount,
        y: columnValue,
      }));

    const isBooleanType = ColumnTypeEnum.TRUE_OR_FALSE === columnType;
    const isDatetimeType = ColumnTypeEnum.DATETIME === columnType;

    let distributionChart;
    if (isDatetimeType) {
      distributionChart = timeSeriesHistograms[columnUUID];
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
    } else if (DISTRIBUTION_COLUMNS.includes(columnType)) {
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
          {ColumnTypeIcon && 
            <Flex title={COLUMN_TYPE_HUMAN_READABLE_MAPPING[columnType]}>
              <ColumnTypeIcon size={UNIT * 2} />
            </Flex>
          }

          <div
            style={{
              marginLeft: UNIT * 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: columnWidth - (UNIT * 4.5),
            }}
          >
            {noColumnLinks
              ?
                <Text
                  bold
                  default
                  title={columns[columnIndex]}
                >
                  {columns[columnIndex]}
                </Text>
              :
                <NextLink
                  as={createDatasetTabRedirectLink(TAB_VISUALIZATIONS, columnIndex)}
                  href="/datasets/[...slug]"
                  passHref
                >
                  <Link
                    bold
                    monospace
                    secondary
                    small
                    title={columns[columnIndex]}
                  >
                    {columns[columnIndex]}
                  </Link>
                </NextLink>
            }
          </div>
        </div>

        {distributionChart}
        {!distributionChart && <div style={{ height: COLUMN_HEADER_CHART_HEIGHT }} />}
      </div>
    );
  };
}
