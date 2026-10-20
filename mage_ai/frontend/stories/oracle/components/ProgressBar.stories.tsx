import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import ProgressBar, { ProgressBarProps } from '@oracle/components/ProgressBar';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  title: 'Oracle/Components/ProgressBar',
  component: ProgressBar,
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <ProgressBar {...props} />
  </ThemeBlock>
);

const Template: StoryFn<ProgressBarProps> = (args) => <TemplateWithTheme {...args} />;

export const Full = Template.bind({});
Full.args = {
  progress: 25,
};

export const Danger = Template.bind({});
Danger.args = {
  ...Full.args,
  danger: true,
};
