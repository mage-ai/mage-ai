import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import TextInput, { TextInputProps } from '../../../../oracle/elements/Inputs/TextInput';
import ThemeBlock from '../../../ThemeBlock';
import { Close, Search } from '../../../../oracle/icons';

export default {
  component: TextInput,
  title: 'Oracle/Elements/Inputs/TextInput',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <TextInput {...props} />
  </ThemeBlock>
);

const Template: StoryFn<TextInputProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  placeholder: 'Placeholder',
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Regular.args,
  disabled: true,
};

export const Danger = Template.bind({});
Danger.args = {
  ...Regular.args,
  meta: {
    error: 'This field is required.',
    touched: true,
  },
};

export const WithBeforeIcon = Template.bind({});
WithBeforeIcon.args = {
  ...Regular.args,
  beforeIcon: <Search />,
};

export const WithAfterIcon = Template.bind({});
WithAfterIcon.args = {
  ...Regular.args,
  afterIcon: <Close />,
};

export const WithBeforeAndAfterIcon = Template.bind({});
WithBeforeAndAfterIcon.args = {
  ...Regular.args,
  afterIcon: <Close />,
  beforeIcon: <Search />,
};

export const WithAfterIconClick = Template.bind({});
WithAfterIconClick.args = {
  ...Regular.args,
  afterIcon: <Close />,
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  label: 'Label',
};
