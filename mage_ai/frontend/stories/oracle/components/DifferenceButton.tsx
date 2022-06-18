import React from 'react';
import { Meta, Story } from '@storybook/react';

import DifferenceButton, { DifferenceButtonProps } from '@oracle/components/DifferenceButton';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  title: 'Oracle/Components/DifferenceButton',
  component: DifferenceButton,
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <DifferenceButton {...props} />
  </ThemeBlock>
);

const Template: Story<DifferenceButtonProps> = (args) => <TemplateWithTheme {...args} />;

export const Full = Template.bind({});
Full.args = {
  percentage: 25,
};

export const Danger = Template.bind({});
Danger.args = {
  ...Full.args,
  danger: true,
};
