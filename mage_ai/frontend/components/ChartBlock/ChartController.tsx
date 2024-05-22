import moment from 'moment';
import { useCallback, useMemo } from 'react';

import BarChartHorizontal from '@components/charts/BarChartHorizontal';
import BarChartVertical from '@components/charts/BarChartVertical';
import BlockType from '@interfaces/BlockType';
import DataTable from '@components/DataTable';
import Histogram from '@components/charts/Histogram';
import LineSeries from '@components/charts/LineSeries';
import PieChart from '@components/charts/PieChart';
import Text from '@oracle/elements/Text';
import Spacing from '@oracle/elements/Spacing';
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
  VARIABLE_NAME_X_TOOLTIP_LABEL_FORMAT,
  VARIABLE_NAME_Y_TOOLTIP_LABEL_FORMAT,
  VARIABLE_NAME_X,
  VARIABLE_GROUP_NAME_DESIGN_Y_VALUES_SMOOTH,
  VARIABLE_NAME_X_AXIS_LABEL_FORMAT,
  VARIABLE_NAME_Y,
  VARIABLE_GROUP_NAME_DESIGN,
  VARIABLE_GROUP_NAME_DESIGN_X_GRID_LINES_HIDDEN,
  VARIABLE_GROUP_NAME_DESIGN_Y_GRID_LINES_HIDDEN,
  VARIABLE_NAME_Y_AXIS_LABEL_FORMAT,
  buildMetricName,
} from '@interfaces/ChartBlockType';
import { DATE_FORMAT_LONG, DATE_FORMAT_SHORT, convertToMillisecondsTimestamp } from '@utils/date';
import { numberWithCommas, roundNumber } from '@utils/string';
import { UNIT } from '@oracle/styles/units/spacing';
import { range, sortByKey } from '@utils/array';
import { TooltipData } from '@components/charts/BarChart/constants';
import { dig, setNested } from '@utils/hash';

type ChartControllerProps = {
  block: BlockType;
  data: {
    [key: string]: any;
  };
  width: number;
  xAxisLabel?: string;
};

function ChartController({ block, data, width, xAxisLabel: xAxisLabelProp }: ChartControllerProps) {
  const { configuration = {} } = block;
  const {
    chart_style: chartStyle,
    chart_type: chartType,
    y_sort_order: ySortOrder,
  } = configuration || {};

  const design = useMemo(() => configuration?.[VARIABLE_GROUP_NAME_DESIGN] || {}, [configuration]);
  const xGridLinesHidden = design?.[VARIABLE_GROUP_NAME_DESIGN_X_GRID_LINES_HIDDEN];
  const yGridLinesHidden = design?.[VARIABLE_GROUP_NAME_DESIGN_Y_GRID_LINES_HIDDEN];
  const yValuesSmooth = design?.[VARIABLE_GROUP_NAME_DESIGN_Y_VALUES_SMOOTH];

  const chartHeight = configuration[VARIABLE_NAME_HEIGHT] || CHART_HEIGHT_DEFAULT;

  const metricNames = configuration?.[VARIABLE_NAME_METRICS]?.map(mn => buildMetricName(mn)) || [];

  function buildFormatFunctionLabel(functionCode?: any): (...args: any[]) => any {
    function formatter(
      value: string | undefined,
      index: number,
      values: {
        value: string | undefined;
        index: number;
      }[],
    ) {
      try {
        const dynamicFunction = new Function('value', 'index', 'values', 'modules', functionCode);
        return dynamicFunction(value, index, values, {
          moment,
        });
      } catch (e) {
        console.log(e);
      }

      return value;
    }

    return formatter;
  }

  function buildFormatFunctionTooltip(functionCode?: any): (...args: any[]) => any {
    function formatter(value: string | undefined, index: number, values: TooltipData) {
      try {
        const dynamicFunction = new Function('value', 'index', 'values', 'modules', functionCode);
        return dynamicFunction(value, index, values, {
          moment,
        });
      } catch (e) {
        console.log(e);
      }

      return value;
    }

    return formatter;
  }

  const xTooltipFormatValue = configuration?.[VARIABLE_NAME_X_TOOLTIP_LABEL_FORMAT];
  const xTooltipFormat = useCallback(
    (...args: any[]) => buildFormatFunctionTooltip(xTooltipFormatValue)(...args),
    [xTooltipFormatValue],
  );
  const yTooltipFormatValue = configuration?.[VARIABLE_NAME_Y_TOOLTIP_LABEL_FORMAT];
  const yTooltipFormat = useCallback(
    (...args: any[]) => buildFormatFunctionTooltip(yTooltipFormatValue)(...args),
    [yTooltipFormatValue],
  );

  const xAxisLabelFormatValue = configuration?.[VARIABLE_NAME_X_AXIS_LABEL_FORMAT];
  const xAxisLabelFormat = useCallback(
    (...args: any[]) => buildFormatFunctionLabel(xAxisLabelFormatValue)(...args),
    [xAxisLabelFormatValue],
  );

  const yAxisLabelFormatValue = configuration?.[VARIABLE_NAME_Y_AXIS_LABEL_FORMAT];
  const yAxisLabelFormat = useCallback(
    (...args: any[]) => buildFormatFunctionLabel(yAxisLabelFormatValue)(...args),
    [yAxisLabelFormatValue],
  );

  const variableDateFormat = useMemo(() => {
    const timeInterval = configuration?.[VARIABLE_NAME_TIME_INTERVAL];
    if (xAxisLabelFormatValue) {
      return xAxisLabelFormatValue;
    } else if (
      [TimeIntervalEnum.HOUR, TimeIntervalEnum.MINUTE, TimeIntervalEnum.SECOND].includes(
        timeInterval,
      )
    ) {
      return DATE_FORMAT_LONG;
    }

    return DATE_FORMAT_SHORT;
  }, [configuration, xAxisLabelFormatValue]);

  if (ChartTypeEnum.BAR_CHART === chartType || ChartTypeEnum.TIME_SERIES_BAR_CHART === chartType) {
    const { x, y } = data;
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
            xLabelFormat={(ts: number, index, values) => {
              if (xAxisLabelFormatValue) {
                return xAxisLabelFormat(ts, index, values);
              } else if (isTimeSeries) {
                return moment(ts * 1000).format(variableDateFormat);
              }

              return ts;
            }}
            xTooltipFormat={xTooltipFormatValue ? xTooltipFormat : null}
            yAxisLabel={xAxisLabelProp || xAxisLabel || configuration[VARIABLE_NAME_X]}
            yLabelFormat={yAxisLabelFormatValue ? yAxisLabelFormat : null}
            yTooltipFormat={yTooltipFormatValue ? yTooltipFormat : null}
          />
        );
      }

      return (
        <BarChartVertical
          {...sharedProps}
          xAxisLabel={xAxisLabelProp || xAxisLabel}
          xLabelFormat={(ts: string, index, values) => {
            if (xAxisLabelFormatValue) {
              if (isTimeSeries) {
                return moment(convertToMillisecondsTimestamp(Number(ts))).format(
                  xAxisLabelFormatValue,
                );
              } else {
                return xAxisLabelFormat(ts, index, values);
              }
            } else if (isTimeSeries) {
              return moment(convertToMillisecondsTimestamp(Number(ts))).format(variableDateFormat);
            }

            return ts;
          }}
          xNumTicks={xy.length}
          xTooltipFormat={xTooltipFormatValue ? xTooltipFormat : null}
          yAxisLabel={yAxisLabel}
          yLabelFormat={yAxisLabelFormatValue ? yAxisLabelFormat : null}
          yNumTicks={5}
          yTooltipFormat={yTooltipFormatValue ? yTooltipFormat : null}
        />
      );
    }
  } else if (ChartTypeEnum.HISTOGRAM === chartType) {
    const { x, y } = data;
    const xAxisLabel = configuration[VARIABLE_NAME_GROUP_BY]?.join(', ');

    if (x && y && Array.isArray(x)) {
      return (
        <Histogram
          data={x.map(({ max: maxValue, min: minValue }, idx: number) => [
            maxValue,
            y?.[idx]?.value,
            minValue,
          ])}
          height={chartHeight}
          large
          margin={{
            left: UNIT * 5,
            right: UNIT * 1,
            top: UNIT * 3,
          }}
          noPadding
          renderTooltipContent={(value, index, { values }) => {
            const [xMin, xMax] = values;

            if (yTooltipFormatValue || xTooltipFormatValue) {
              let xTip, yTip;

              if (yTooltipFormat) {
                yTip = yTooltipFormat(value, index, {
                  values,
                });
              }

              if (xTooltipFormat) {
                xTip = xTooltipFormat(value, index, {
                  values,
                });
              }

              return (
                <>
                  {[yTip, xTip]
                    ?.filter?.(t => t)
                    ?.map((text: string, idx: number) => (
                      <div key={text} style={{ marginTop: idx >= 1 ? 1 : 0 }}>
                        <Text inverted monospace small>
                          {text}
                        </Text>
                      </div>
                    ))}
                </>
              );
            }

            return (
              <>
                <Text inverted monospace small>
                  {value}
                </Text>
                <Text bold inverted monospace small>
                  {xMin}{' '}
                  <Text inline inverted muted small>
                    &#8594;
                  </Text>{' '}
                  {xMax}
                </Text>
              </>
            );
          }}
          showAxisLabels
          showYAxisLabels
          showZeroes
          sortData={d => sortByKey(d, '[0]')}
          width={width}
          xAxisLabel={xAxisLabelProp || xAxisLabel || configuration[VARIABLE_NAME_X]}
          xLabelFormat={xAxisLabelFormatValue ? xAxisLabelFormat : null}
          yAxisLabel={xAxisLabel ? `count(${xAxisLabel})` : configuration[VARIABLE_NAME_Y]}
          yLabelFormat={yAxisLabelFormatValue ? yAxisLabelFormat : null}
          yTooltipFormat={yTooltipFormatValue ? yTooltipFormat : null}
        />
      );
    }
  } else if (
    ChartTypeEnum.LINE_CHART === chartType ||
    ChartTypeEnum.TIME_SERIES_LINE_CHART === chartType
  ) {
    const { x, y } = data;
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
          // areaBetweenLines
          data={dataParsed}
          height={chartHeight}
          hideGridX={!!xGridLinesHidden}
          hideGridY={!!yGridLinesHidden}
          lineLegendNames={legendNames}
          margin={{
            bottom: 8 * UNIT,
            left: 5 * UNIT,
          }}
          noCurve={!yValuesSmooth}
          renderXTooltipContent={(x, yNotUsed, toolipData) => {
            const { index, y } = toolipData;

            let xLabel = configuration[VARIABLE_NAME_X];
            let xValueText = x;
            if (configuration[VARIABLE_NAME_GROUP_BY]) {
              xLabel = configuration[VARIABLE_NAME_GROUP_BY].map(String).join(', ');
            }

            if (xTooltipFormatValue) {
              return (
                <Text inverted small>
                  {xTooltipFormat(x, xLabel, toolipData)}
                </Text>
              );
            }

            if (isTimeSeries) {
              xValueText = moment(convertToMillisecondsTimestamp(Number(x))).format(
                variableDateFormat,
              );
            }

            return (
              <Text inverted small>
                <Text bold inline inverted small>
                  {xLabel}
                </Text>
                :{' '}
                <Text inline inverted monospace small>
                  {xValueText}
                </Text>
              </Text>
            );
          }}
          renderYTooltipContent={(y, idx, toolipData) => {
            if (yTooltipFormatValue) {
              return (
                <Text inverted small>
                  {yTooltipFormat(y, metricNames[idx], toolipData)}
                </Text>
              );
            }

            return (
              <Text inverted small>
                <Text bold inline inverted small>
                  {metricNames[idx]}
                </Text>
                :{' '}
                <Text inline inverted monospace small>
                  {y}
                </Text>
              </Text>
            );
          }}
          thickness={4}
          timeSeries={isTimeSeries}
          width={width ? width - (3 * UNIT + 3) : width}
          xAxisLabel={xAxisLabelProp || xAxisLabel || String(configuration[VARIABLE_NAME_X] || '')}
          xLabelFormat={(ts: number, index, values) => {
            let val = String(ts);

            if (xAxisLabelFormatValue) {
              if (isTimeSeries) {
                val = moment(convertToMillisecondsTimestamp(ts)).format(xAxisLabelFormatValue);
              } else {
                val = xAxisLabelFormat(ts, index, values);
              }
            } else if (isTimeSeries) {
              val = moment(convertToMillisecondsTimestamp(ts)).format(variableDateFormat);
            }

            return val;
          }}
          yAxisLabel={yAxisLabel || String(configuration[VARIABLE_NAME_Y])}
          yLabelFormat={yAxisLabelFormatValue ? yAxisLabelFormat : undefined}
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
          thickness={0.5}
          width={width}
          xAxisLabel={xAxisLabelProp || xAxisLabel || String(configuration[VARIABLE_NAME_X] || '')}
          xLabelFormat={xAxisLabelFormatValue ? xAxisLabelFormat : undefined}
          xTooltipFormat={xTooltipFormatValue ? xTooltipFormat : null}
          yLabelFormat={yAxisLabelFormatValue ? yAxisLabelFormat : undefined}
          yTooltipFormat={yTooltipFormatValue ? yTooltipFormat : null}
        />
      );
    }
  } else if (ChartTypeEnum.TABLE === chartType) {
    const { index, x, y } = data;

    return (
      Array.isArray(x) &&
      Array.isArray(y) &&
      Array.isArray(y[0]) && (
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
      )
    );
  }

  return <div />;
}

export default ChartController;
