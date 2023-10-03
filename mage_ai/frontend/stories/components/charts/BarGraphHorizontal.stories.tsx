import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import BarGraphHorizontal, { BarStackHorizontalContainerProps } from '@components/charts/BarGraphHorizontal';
import ThemeBlock from '../../ThemeBlock';
import { UNIT } from '@oracle/styles/units/spacing';

export default {
  component: BarGraphHorizontal,
  title: 'Components/Charts/BarGraphHorizontal',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    {/*@ts-ignore*/}
    <BarGraphHorizontal {...props} />
  </ThemeBlock>
);

const Template: StoryFn<BarStackHorizontalContainerProps> =
  (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});

const data = [
  {
    x: 0.5,
    y: 'Feature 1',
  },
  {
    x: 0.25,
    y: 'Feature 2',
  },
  {
    x: 0.4,
    y: 'Feature 3',
  },
  {
    x: 0.65,
    y: 'Feature 4',
  },
  {
    x: 0.85,
    y: 'Feature 5',
  },
];

Regular.args = {
  data,
  height: Math.max(3 * data.length * UNIT, UNIT * 50),
  renderTooltipContent: ({ x }) => `The value of this bar is ${x}`,
  xNumTicks: 2,
  ySerialize: ({ y }) => y,
};
