import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Badge, { BadgeProps } from '@oracle/components/Badge';
import ThemeBlock from '../../ThemeBlock';

export default {
  title: 'Oracle/Components/Badge',
  component: Badge,
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Badge {...props} />
  </ThemeBlock>
);

const Template: StoryFn<BadgeProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  children: 'LABEL',
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Regular.args,
  disabled: true,
};

export const Quantifier = Template.bind({});
Quantifier.args = {
  children: '99+',
  quantifier: true,
};
