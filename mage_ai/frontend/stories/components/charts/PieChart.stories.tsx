import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import ThemeBlock from '../../ThemeBlock';
import { UNIT } from '@oracle/styles/units/spacing';
import PieChart, { PieChartProps } from '@components/charts/PieChart';
import { numberWithCommas } from '@utils/string';

export default {
  component: PieChart,
  title: 'Components/Charts/PieChart'
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock sideBySide>
    {/*@ts-ignore*/}
    <PieChart {...props} />
  </ThemeBlock>
);

const Template: StoryFn<PieChartProps> =
  (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});

const data = [
  [
    'Category 1',
    50,
  ],
  [
    'Category 2',
    60,
  ],
  [
    'Category 3',
    70,
  ],
  [
    'Category 4',
    80,
  ],
  [
    'Category 5',
    90,
  ],
]

Regular.args = {
  data,
  getX: ([label, value]) => `${label} (${numberWithCommas(value)})`,
  getY: ([, value]) => value,
  height: 60 * UNIT,
}