import React from 'react';
import { Meta, Story } from '@storybook/react';

import Chip, { ChipProps } from '@oracle/components/Chip';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: Chip,
  title: 'Oracle/Components/Chip',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Chip {...props} />
  </ThemeBlock>
);

const Template: Story<ChipProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  children: 'feature',
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Regular.args,
  disabled: true,
};
