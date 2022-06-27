import React from 'react';
import { Meta, Story } from '@storybook/react';

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

const Template: Story<BoxPlotHorizontalProps> =
  (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});

Regular.args = {
  min: 24,
  firstQuartile: 25,
  median: 90,
  thirdQuartile: 95,
  max: 100,
};
