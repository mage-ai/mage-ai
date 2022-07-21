import BlockType, {
  ChartTypeEnum,
} from '@interfaces/BlockType';
import Histogram from '@components/charts/Histogram';
import PieChart from '@components/charts/PieChart';
import Text from '@oracle/elements/Text';
import { CHART_HEIGHT_DEFAULT } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { VARIABLE_NAME_X } from './constants';
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
    configuration,
  } = block;
  const chartType = configuration?.chart_type;

  if (ChartTypeEnum.HISTOGRAM === chartType) {
    const {
      x,
      y,
    } = data;

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

  return (
    <Text>
      {chartType} not yet supported.
    </Text>
  );
}

export default ChartController;
