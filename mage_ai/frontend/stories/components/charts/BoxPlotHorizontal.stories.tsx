import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import BoxPlotHorizontal, { BoxPlotHorizontalProps } from '@components/charts/BoxPlotHorizontal';
import ThemeBlock from '../../ThemeBlock';

export default {
  component: BoxPlotHorizontal,
  title: 'Components/Charts/BoxPlotHorizontal',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    {/*@ts-ignore*/}
    <BoxPlotHorizontal {...props} />
  </ThemeBlock>
);

const Template: StoryFn<BoxPlotHorizontalProps> =
  (args) => <TemplateWithTheme {...args} />;

const data = {
  min: 5,
  firstQuartile: 25,
  median: 70,
  thirdQuartile: 85,
  max: 100,
  outliers: [
    -20, 0, 3, 105,
  ],
};

export const Default = Template.bind({});

Default.args = {
  data,
  height: 50,
};

export const OneSided = Template.bind({});

OneSided.args = {
  data: {
    ...data,
    outliers: [
      -20, -5,
    ],
  },
  height: 50,
  width: 200,
};

export const Primary = Template.bind({});

Primary.args = {
  data,
  height: 50,
  primary: true,
  width: 250,
};

export const Secondary = Template.bind({});

Secondary.args = {
  data,
  height: 50,
  secondary: true,
  width: 250,
};

export const Danger = Template.bind({});

Danger.args = {
  data,
  height: 50,
  danger: true,
  width: 250,
};
