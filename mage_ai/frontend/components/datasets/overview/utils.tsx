import NextLink from 'next/link';

import BarGraphHorizontal from '@components/charts/BarGraphHorizontal';
import Flex from '@oracle/components/Flex';
import Histogram from '@components/charts/Histogram';
import Link from '@oracle/elements/Link';
import PieChart from '@components/charts/PieChart';
import SuggestionType from '@interfaces/SuggestionType';
import Text from '@oracle/elements/Text';
import {
  DISTRIBUTION_COLUMNS,
  DISTRIBUTION_STATS,
} from '../constants';
import { COLUMN_TYPE_ICON_MAPPING } from '@components/constants';
import { ChartTypeEnum } from '@interfaces/InsightsType';
import { ColumnTypeEnum, COLUMN_TYPE_HUMAN_READABLE_MAPPING } from '@interfaces/FeatureType';
import { TAB_VISUALIZATIONS } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildDistributionData } from '@components/datasets/Insights/utils/data';
import { createDatasetTabRedirectLink } from '@components/utils';
import { numberWithCommas } from '@utils/string';
import { sortByKey } from '@utils/array';

export const COLUMN_HEADER_CHART_HEIGHT = UNIT * 12;

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
          renderTooltipContent={(value, _, {
            values,
          }) => {
            const [xLabelMin, xLabelMax] = values;
            return (
              <p>
                Rows: {value}
                <br />
                Start: {xLabelMin}
                <br />
                End: {xLabelMax}
              </p>
            );
          }}
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
          renderTooltipContent={(value, _, opts) => {
            const xLabelMin = opts?.values?.[0];
            const xLabelMax = opts?.values?.[1];
            const hideRange = (typeof xLabelMin === 'undefined' || typeof xLabelMax === 'undefined');
            return (
              <p>
                {hideRange && (
                  <>
                    Rows: {value}
                    <br />
                    Value: {typeof xLabelMin !== 'undefined' ? xLabelMin : xLabelMax}
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
            );
          }}
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
