import React from 'react';
import { Meta, Story } from '@storybook/react';

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

const Template: Story<SelectProps> = (args) => <TemplateWithTheme {...args} />;

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

export const Compact = Template.bind({});
Compact.args = {
  ...Regular.args,
  compact: true,
};

export const CompactWithBeforeIcon = Template.bind({});
CompactWithBeforeIcon.args = {
  ...WithBeforeIcon.args,
  ...Compact.args,
};
