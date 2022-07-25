import moment from 'moment';

import BarChartHorizontal from '@components/charts/BarChartHorizontal';
import BlockType from '@interfaces/BlockType';
import DataTable from '@components/DataTable';
import Histogram from '@components/charts/Histogram';
import LineSeries from '@components/charts/LineSeries';
import PieChart from '@components/charts/PieChart';
import Text from '@oracle/elements/Text';
import { CHART_HEIGHT_DEFAULT } from './index.style';
import {
  ChartStyleEnum,
  ChartTypeEnum,
  SortOrderEnum,
  VARIABLE_NAME_BUCKETS,
  VARIABLE_NAME_GROUP_BY,
  VARIABLE_NAME_LEGEND_LABELS,
  VARIABLE_NAME_METRICS,
  VARIABLE_NAME_X,
  VARIABLE_NAME_Y,
  buildMetricName,
} from '@interfaces/ChartBlockType';
import { DATE_FORMAT_SHORT, numberWithCommas, roundNumber } from '@utils/string';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { range, sortByKey } from '@utils/array';

type ChartControllerProps = {
  block: BlockType;
  data: {
    [key: string]: any;
  };
  width: number;
};

function ChartController({
  block,
  data,
  width,
}: ChartControllerProps) {
  const {
    configuration = {},
  } = block;
  const {
    chart_style: chartStyle,
    chart_type: chartType,
    y_sort_order: ySortOrder,
  } = configuration || {};

  let metricNames = configuration?.[VARIABLE_NAME_METRICS]?.map(mn => buildMetricName(mn))
    || [];

  if (ChartTypeEnum.BAR_CHART === chartType
    || ChartTypeEnum.TIME_SERIES_BAR_CHART === chartType) {
    const {
      x,
      y,
    } = data;
    const isTimeSeries = ChartTypeEnum.TIME_SERIES_BAR_CHART === chartType;

    if (x && y && Array.isArray(x) && Array.isArray(y)) {
      if (!metricNames.length) {
        metricNames.push(VARIABLE_NAME_Y);
      }
      const metricName = metricNames[0];
      const xAxisLabel = configuration[VARIABLE_NAME_GROUP_BY]?.join(', ');
      const yAxisLabel = metricNames?.join(', ');

      if (ChartStyleEnum.HORIZONTAL === chartStyle && !isTimeSeries) {
        let xy = x.map((xValue, idx1: number) => ({
          __y: xValue,
          ...metricNames.reduce((acc, mn, idx2) => {
            const v = y?.[idx2]?.[idx1];
            if (typeof v === 'undefined') {
              return acc;
            }

            return {
              ...acc,
              [mn]: v,
            };
          }, {}),
        }));

        if (SortOrderEnum.ASCENDING === ySortOrder) {
          xy = sortByKey(xy, d => d[metricName], { ascending: false });
        } else if (SortOrderEnum.DESCENDING === ySortOrder) {
          xy = sortByKey(xy, d => d[metricName], { ascending: true });
        }

        return (
          <BarChartHorizontal
            data={xy}
            height={CHART_HEIGHT_DEFAULT}
            margin={{
              bottom: UNIT * 3,
              left: UNIT * 1,
              right: UNIT * 3,
              top: 0,
            }}
            width={width}
            xNumTicks={3}
            xAxisLabel={yAxisLabel}
            yAxisLabel={xAxisLabel}
          />
        );
      }

      return (
        <Histogram
          data={x.map((xValue , idx: number) => [
            xValue,
            y[0][idx],
          ])}
          height={CHART_HEIGHT_DEFAULT}
          width={width}
          large
          margin={{
            left: UNIT * 5,
            right: UNIT * 1,
          }}
          renderTooltipContent={([xValue, yValue]) => {
            let xLabel = configuration[VARIABLE_NAME_X];
            if (configuration[VARIABLE_NAME_GROUP_BY]) {
              xLabel = configuration[VARIABLE_NAME_GROUP_BY].map(String).join(', ');
            }

            let xValueText = xValue;
            if (isTimeSeries) {
              xValueText = moment(xValue * 1000).format(DATE_FORMAT_SHORT);
            }

            return (
              <Text inverted monospace small>
                {metricName}: {yValue?.toFixed(4)}
                <br />
                {xLabel}: {xValueText}
              </Text>
            );
          }}
          showAxisLabels
          showYAxisLabels
          showZeroes
          sortData={(d) => {
            if (SortOrderEnum.ASCENDING === ySortOrder) {
              return sortByKey(d, '[1]', { ascending: true });
            } else if (SortOrderEnum.DESCENDING === ySortOrder) {
              return sortByKey(d, '[1]', { ascending: false });
            }

            return d;
          }}
          xAxisLabel={xAxisLabel}
          xLabelFormat={ts => {
            if (isTimeSeries) {
              return moment(ts * 1000).format(DATE_FORMAT_SHORT);
            }

            return ts;
          }}
          yAxisLabel={yAxisLabel}
        />
      );
    }
  } else if (ChartTypeEnum.HISTOGRAM === chartType) {
    const {
      x,
      y,
    } = data;
    const xAxisLabel = configuration[VARIABLE_NAME_GROUP_BY]?.join(', ');

    if (x && y && Array.isArray(x)) {
      return (
        <Histogram
          data={x.map(({
            max: maxValue,
            min: minValue,
          } , idx: number) => [
            maxValue,
            y?.[idx]?.value,
            minValue,
          ])}
          height={CHART_HEIGHT_DEFAULT}
          width={width}
          large
          margin={{
            left: UNIT * 5,
            right: UNIT * 1,
            top: UNIT * 3,
          }}
          noPadding
          renderTooltipContent={([maxValue, value, minValue]) => (
            <Text inverted monospace small>
              Count : {value}
              <br />
              Bucket: {minValue}-{maxValue}
            </Text>
          )}
          showAxisLabels
          showYAxisLabels
          showZeroes
          sortData={d => sortByKey(d, '[0]')}
          xAxisLabel={xAxisLabel}
          yAxisLabel={`count(${xAxisLabel})`}
        />
      );
    }
  } else if (ChartTypeEnum.LINE_CHART === chartType
    || ChartTypeEnum.TIME_SERIES_LINE_CHART === chartType
  ) {
    const {
      x,
      y,
    } = data;
    const isTimeSeries = ChartTypeEnum.TIME_SERIES_LINE_CHART === chartType;

    if (x && y && Array.isArray(x) && Array.isArray(y) && Array.isArray(y?.[0])) {
      let legendNames = metricNames;
      if (configuration[VARIABLE_NAME_LEGEND_LABELS]) {
        legendNames = configuration[VARIABLE_NAME_LEGEND_LABELS].split(',').map(s => s.trim());
      }
      const dataParsed = x.map((val, idx) => ({
        x: val,
        y: range(y.length).map((_, idx2) => {
          const v = y[idx2][idx];

          if (typeof v === 'undefined' || v === null) {
            return 0;
          }

          return v;
        }),
      }));

      const xAxisLabel = configuration[VARIABLE_NAME_GROUP_BY]?.join(', ');
      const yAxisLabel = metricNames.join(', ');

      return (
        <LineSeries
          data={dataParsed}
          height={CHART_HEIGHT_DEFAULT}
          lineLegendNames={legendNames}
          margin={{
            bottom: 8 * UNIT,
            left: 5 * UNIT,
          }}
          noCurve
          renderXTooltipContent={({
            index,
            x,
          }) => {
            let xLabel = configuration[VARIABLE_NAME_X];
            let xValueText = x;
            if (configuration[VARIABLE_NAME_GROUP_BY]) {
              xLabel = configuration[VARIABLE_NAME_GROUP_BY].map(String).join(', ');
            }
            if (isTimeSeries) {
              xValueText = moment(x * 1000).format(DATE_FORMAT_SHORT);
            }

            return (
              <Text inverted small>
                {xLabel}: {xValueText}
              </Text>
            );
          }}
          renderYTooltipContent={({ y }, idx) => (
            <Text inverted small>
              {legendNames && legendNames[idx] && `${legendNames[idx]}: `}{y && numberWithCommas(roundNumber(y[idx], 4))}
            </Text>
          )}
          width={width ? width - (3 * UNIT) : width}
          xAxisLabel={xAxisLabel || String(configuration[VARIABLE_NAME_X])}
          xLabelFormat={ts => {
            if (isTimeSeries) {
              return moment(ts * 1000).format(DATE_FORMAT_SHORT);
            }

            return ts;
          }}
          yAxisLabel={yAxisLabel || String(configuration[VARIABLE_NAME_Y])}
          yLabelFormat={v => v}
        />
      );
    }
  } else if (ChartTypeEnum.PIE_CHART === chartType) {
    const varName = String(configuration[VARIABLE_NAME_X]);
    const chartData = data[varName];
    const xAxisLabel = configuration[VARIABLE_NAME_GROUP_BY]?.join(', ');

    if (chartData) {
      return (
        <PieChart
          data={Object.entries(chartData)}
          getX={([label, value]) => `${label} (${numberWithCommas(value)})`}
          getY={([, value]) => value}
          height={CHART_HEIGHT_DEFAULT}
          width={width}
          xAxisLabel={xAxisLabel || String(configuration[VARIABLE_NAME_X])}
        />
      );
    }
  } else if (ChartTypeEnum.TABLE === chartType) {
    const {
      x,
      y,
    } = data;

    return Array.isArray(x) && Array.isArray(y) && Array.isArray(y[0]) && (
      <DataTable
        columns={x}
        // index={index}
        height={CHART_HEIGHT_DEFAULT}
        noBorderBottom
        noBorderLeft
        noBorderRight
        noBorderTop
        rows={y}
        width={width ? width - SCROLLBAR_WIDTH : width}
      />
    );
  }

  return <div />;
}

export default ChartController;
