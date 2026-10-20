import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Select, { SelectProps } from '../../../../oracle/elements/Inputs/Select';
import ThemeBlock from '../../../ThemeBlock';
import { Check } from '../../../../oracle/icons';

export default {
  title: 'Oracle/Elements/Inputs/Select',
  component: Select,
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Select {...props} />
  </ThemeBlock>
);

const Template: StoryFn<SelectProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  children: [
    <option value="1">Option 1</option>,
    <option value="2">Option 2</option>,
  ],
  placeholder: 'Placeholder',
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  ...Regular.args,
  label: 'Label',
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Regular.args,
  disabled: true,
};

export const WithBeforeIcon = Template.bind({});
WithBeforeIcon.args = {
  ...Regular.args,
  beforeIcon: <Check />,
};
