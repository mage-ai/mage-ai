import BarGraphHorizontal from '@components/charts/BarGraphHorizontal';
import BlockType from '@interfaces/BlockType';
import Histogram from '@components/charts/Histogram';
import PieChart from '@components/charts/PieChart';
import Text from '@oracle/elements/Text';
import { CHART_HEIGHT_DEFAULT } from './index.style';
import {
  ChartStyleEnum,
  ChartTypeEnum,
  SortOrderEnum,
  VARIABLE_NAME_X,
} from '@interfaces/ChartBlockType';
import { UNIT } from '@oracle/styles/units/spacing';
import { numberWithCommas } from '@utils/string';
import { sortByKey } from '@utils/array';

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

  if (ChartTypeEnum.BAR_CHART === chartType) {
    const {
      x,
      y,
    } = data;

    if (x && y && Array.isArray(x)) {
      if (ChartStyleEnum.HORIZONTAL === chartStyle) {
        let xy = x.map((xValue, idx: number) => ({
          x: y[idx],
          y: xValue,
        }));

        if (SortOrderEnum.ASCENDING === ySortOrder) {
          xy = sortByKey(xy, 'x', { ascending: false });
        } else if (SortOrderEnum.DESCENDING === ySortOrder) {
          xy = sortByKey(xy, 'x', { ascending: true });
        }

        return (
          <BarGraphHorizontal
            data={xy}
            height={CHART_HEIGHT_DEFAULT}
            margin={{
              bottom: UNIT * 3,
              left: UNIT * 1,
              right: UNIT * 3,
              top: 0,
            }}
            renderTooltipContent={({ x }) => x}
            width={width}
            xNumTicks={3}
            ySerialize={({ y }) => y}
          />
        );
      }

      return (
        <Histogram
          data={x.map((xValue , idx: number) => [
            xValue,
            y[idx],
          ])}
          height={CHART_HEIGHT_DEFAULT}
          width={width}
          large
          margin={{
            left: UNIT * 5,
            right: UNIT * 1,
          }}
          renderTooltipContent={([, yValue]) => (
            <Text inverted monospace small>
              {yValue}
            </Text>
          )}
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
        />
      );
    }
  } else if (ChartTypeEnum.HISTOGRAM === chartType) {
    const {
      x,
      y,
    } = data;

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
        />
      );
    }
  } else if (ChartTypeEnum.PIE_CHART === chartType) {
    const varName = String(configuration[VARIABLE_NAME_X]);
    const chartData = data[varName];

    if (chartData) {
      return (
        <PieChart
          data={Object.entries(chartData)}
          getX={([label, value]) => `${label} (${numberWithCommas(value)})`}
          getY={([, value]) => value}
          height={CHART_HEIGHT_DEFAULT}
          width={width}
        />
      );
    }
  }

  return <div />;
}

export default ChartController;
