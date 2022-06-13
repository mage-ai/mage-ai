import React from 'react';
import { Meta, Story } from '@storybook/react';

import ProgressIcon, { ProgressIconProps } from '@oracle/components/ProgressIcon';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  title: 'Oracle/Components/ProgressIcon',
  component: ProgressIcon,
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <ProgressIcon {...props} />
  </ThemeBlock>
);

const Template: Story<ProgressIconProps> = (args) => <TemplateWithTheme {...args} />;

export const Full = Template.bind({});
Full.args = {
  percentage: 25,
};

export const Danger = Template.bind({});
Danger.args = {
  ...Full.args,
  danger: true,
};
