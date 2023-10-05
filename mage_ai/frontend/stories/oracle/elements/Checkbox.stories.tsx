import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Checkbox, { CheckboxProps } from '@oracle/elements/Checkbox';
import ThemeBlock from '../../ThemeBlock';
import { CalendarDate } from '@oracle/icons';

export default {
  component: Checkbox,
  title: 'Oracle/Elements/Checkbox',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Checkbox {...props} />
  </ThemeBlock>
);

const Template: StoryFn<CheckboxProps> = (args) => <TemplateWithTheme {...args} />;

export const Unchecked = Template.bind({});
Unchecked.args = {
  label: 'Unchecked',
};

export const Checked = Template.bind({});
Checked.args = {
  checked: true,
  label: 'Checked',
};

export const UncheckedWithIcon = Template.bind({});
UncheckedWithIcon.args = {
  beforeIcon: (
    <CalendarDate size={16} />
  ),
  label: 'Unchecked with icon',
};

export const SmallText = Template.bind({});
SmallText.args = {
  small: true,
  label: 'Small text',
};

export const MonospaceText = Template.bind({});
MonospaceText.args = {
  monospace: true,
  label: 'Monospace text',
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  label: 'Disabled',
};

export const Required = Template.bind({});
Required.args = {
  label: 'Required',
  required: true,
};
