import React from 'react';
import { Meta, Story } from '@storybook/react';

import Progress, { ProgressProps } from '@oracle/components/Progress';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  title: 'Oracle/Components/Progress',
  component: Progress,
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Progress {...props} />
  </ThemeBlock>
);

const Template: Story<ProgressProps> = (args) => <TemplateWithTheme {...args} />;

export const Full = Template.bind({});
Full.args = {
  progress: 25,
};

export const Danger = Template.bind({});
Danger.args = {
  ...Full.args,
  danger: true,
};
