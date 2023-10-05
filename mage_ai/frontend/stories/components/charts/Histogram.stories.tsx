import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import ThemeBlock from '../../ThemeBlock';
import { UNIT } from '@oracle/styles/units/spacing';
import Histogram, { HistogramContainerProps } from '@components/charts/Histogram';
import Text from '@oracle/elements/Text';
import { sortByKey } from '@utils/array';

export default {
  component: Histogram,
  title: 'Components/Charts/Histogram',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock sideBySide>
    {/*@ts-ignore*/}
    <Histogram {...props} />
  </ThemeBlock>
);

const Template: StoryFn<HistogramContainerProps> =
  (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});

const data = [
  [
    'Date 1',
    30,
    '1/1/2022',
    '1/31/2022',
    '1/1/2022',
    '1/31/2022',
    false,
  ],
  [
    'Date 2',
    10,
    '2/1/2022',
    '2/28/2022',
    '2/1/2022',
    '2/28/2022',
    false,
  ],
  [
    'Date 3',
    60,
    '3/1/2022',
    '3/31/2022',
    '3/1/2022',
    '3/31/2022',
    false,
  ],
  [
    'Date 4',
    45,
    '4/1/2022',
    '4/30/2022',
    '4/1/2022',
    '4/30/2022',
    false,
  ],
  [
    'Date 5',
    25,
    '5/1/2022',
    '5/31/2022',
    '5/1/2022',
    '5/31/2022',
    false,
  ],
];

Regular.args = {
  data,
  // getBarColor: () => PURPLE,
  height: UNIT * 50,
  invertedColors: true,
  key: 'Date',
  large: true,
  renderTooltipContent: ([, count, xLabelMin, xLabelMax]) => (
    <Text small>
      Rows: {count}
      <br />
      Dates: {xLabelMin} - {xLabelMax}
    </Text>
  ),
  showAxisLabels: true,
  showYAxisLabels: true,
  showZeroes: true,
  sortData: d => sortByKey(d, '[4]'),
  width: 500,
};
