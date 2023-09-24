import moment from 'moment';

import BarChartHorizontal from '@components/charts/BarChartHorizontal';
import BarChartVertical from '@components/charts/BarChartVertical';
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
  TimeIntervalEnum,
  VARIABLE_NAME_GROUP_BY,
  VARIABLE_NAME_HEIGHT,
  VARIABLE_NAME_LEGEND_LABELS,
  VARIABLE_NAME_METRICS,
  VARIABLE_NAME_TIME_INTERVAL,
  VARIABLE_NAME_X,
  VARIABLE_NAME_Y,
  buildMetricName,
} from '@interfaces/ChartBlockType';
import {
  DATE_FORMAT_LONG,
  DATE_FORMAT_SHORT,
} from '@utils/date';
import {
  numberWithCommas,
  roundNumber,
} from '@utils/string';
import { UNIT } from '@oracle/styles/units/spacing';
import { range, sortByKey } from '@utils/array';

type ChartControllerProps = {
  block: BlockType;
  data: {
    [key: string]: any;
  };
  width: number;
  xAxisLabel?: string;
};

function ChartController({
  block,
  data,
  width,
  xAxisLabel: xAxisLabelProp,
}: ChartControllerProps) {
  const {
    configuration = {},
  } = block;
  const {
    chart_style: chartStyle,
    chart_type: chartType,
    y_sort_order: ySortOrder,
  } = configuration || {};

  const chartHeight = configuration[VARIABLE_NAME_HEIGHT] || CHART_HEIGHT_DEFAULT;

  const metricNames = configuration?.[VARIABLE_NAME_METRICS]?.map(mn => buildMetricName(mn))
    || [];

  let variableDateFormat = DATE_FORMAT_SHORT;
  const timeInterval = configuration[VARIABLE_NAME_TIME_INTERVAL];
  if ([
    TimeIntervalEnum.HOUR,
    TimeIntervalEnum.MINUTE,
    TimeIntervalEnum.SECOND,
  ].includes(timeInterval)) {
    variableDateFormat = DATE_FORMAT_LONG;
  }

  if (ChartTypeEnum.BAR_CHART === chartType
    || ChartTypeEnum.TIME_SERIES_BAR_CHART === chartType) {
    const {
      x,
      y,
    } = data;
    const isTimeSeries = ChartTypeEnum.TIME_SERIES_BAR_CHART === chartType;

    if (x && y && Array.isArray(x) && Array.isArray(y)) {
      const xAxisLabel = configuration[VARIABLE_NAME_GROUP_BY]?.join(', ');
      const yAxisLabel = metricNames?.join(', ');

      if (!metricNames.length) {
        metricNames.push(VARIABLE_NAME_Y);
      }
      const metricName = metricNames[0];

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

      if (ChartStyleEnum.HORIZONTAL === chartStyle) {
        if (SortOrderEnum.ASCENDING === ySortOrder) {
          xy = sortByKey(xy, d => d[metricName], { ascending: false });
        } else if (SortOrderEnum.DESCENDING === ySortOrder) {
          xy = sortByKey(xy, d => d[metricName], { ascending: true });
        }
      } else if (ChartStyleEnum.VERTICAL === chartStyle) {
        if (SortOrderEnum.ASCENDING === ySortOrder) {
          xy = sortByKey(xy, d => d[metricName], { ascending: true });
        } else if (SortOrderEnum.DESCENDING === ySortOrder) {
          xy = sortByKey(xy, d => d[metricName], { ascending: false });
        }
      }

      const sharedProps = {
        data: xy,
        height: chartHeight,
        renderNoDataText: () => 'No data matching query',
        width,
        xNumTicks: 3,
      };

      if (ChartStyleEnum.HORIZONTAL === chartStyle) {
        return (
          <BarChartHorizontal
            {...sharedProps}
            xAxisLabel={yAxisLabel || configuration[VARIABLE_NAME_Y]}
            yAxisLabel={xAxisLabelProp || xAxisLabel || configuration[VARIABLE_NAME_X]}
          />
        );
      }

      return (
        <BarChartVertical
          {...sharedProps}
          xAxisLabel={xAxisLabelProp || xAxisLabel}
          xLabelFormat={ts => {
            if (isTimeSeries) {
              return moment(ts * 1000).format(DATE_FORMAT_SHORT);
            }

            return ts;
          }}
          xNumTicks={xy.length}
          yAxisLabel={yAxisLabel}
          yNumTicks={5}
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
          height={chartHeight}
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
          xAxisLabel={xAxisLabelProp || xAxisLabel || configuration[VARIABLE_NAME_X]}
          yAxisLabel={xAxisLabel ? `count(${xAxisLabel})` : configuration[VARIABLE_NAME_Y]}
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
          height={chartHeight}
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
              xValueText = moment(x * 1000).format(variableDateFormat);
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
          width={width ? width - ((3 * UNIT) + 3) : width}
          xAxisLabel={xAxisLabelProp
            || xAxisLabel
            || String(configuration[VARIABLE_NAME_X] || '')
          }
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
    const varName = String(configuration[VARIABLE_NAME_X] || VARIABLE_NAME_X);
    const chartData = data[varName];
    const xAxisLabel = configuration[VARIABLE_NAME_GROUP_BY]?.join(', ');

    if (chartData) {
      return (
        <PieChart
          data={Object.entries(chartData)}
          getX={([label, value]) => `${label} (${numberWithCommas(value)})`}
          getY={([, value]) => value}
          height={chartHeight}
          width={width}
          xAxisLabel={xAxisLabelProp
            || xAxisLabel
            || String(configuration[VARIABLE_NAME_X] || '')
          }
        />
      );
    }
  } else if (ChartTypeEnum.TABLE === chartType) {
    const {
      index,
      x,
      y,
    } = data;

    return Array.isArray(x) && Array.isArray(y) && Array.isArray(y[0]) && (
      <DataTable
        columns={x}
        height={configuration[VARIABLE_NAME_HEIGHT] ? null : chartHeight}
        index={index}
        maxHeight={configuration[VARIABLE_NAME_HEIGHT] ? chartHeight : null}
        noBorderBottom
        noBorderLeft
        noBorderRight
        noBorderTop
        rows={y}
        width={width}
      />
    );
  }

  return <div />;
}

export default ChartController;
