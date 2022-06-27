import React from 'react';
import { Meta, Story } from '@storybook/react';

import BoxPlotHorizontal, { BoxPlotHorizontalProps } from '@components/charts/BoxPlotHorizontal';
import ThemeBlock from '../../ThemeBlock';
import { UNIT } from '@oracle/styles/units/spacing';

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

const Template: Story<BoxPlotHorizontalProps> =
  (args) => <TemplateWithTheme {...args} />;

const data = {
  min: 5,
  firstQuartile: 25,
  median: 70,
  thirdQuartile: 85,
  max: 100,
  outliers: [
    105,
    2,
    125,
  ],
};

export const Regular = Template.bind({});

Regular.args = {
  data,
  width: UNIT*4,
};

export const Primary = Template.bind({});

Primary.args = {
  data,
  primary: true,
  width: UNIT*4,
};

export const Secondary = Template.bind({});

Secondary.args = {
  data,
  secondary: true,
  width: UNIT*4,
};

export const Danger = Template.bind({});

Danger.args = {
  data,
  danger: true,
  width: UNIT*4,
};
