import React from 'react';
import { Meta, Story } from '@storybook/react';

import TextInput, { TextInputProps } from '../../../../oracle/elements/Inputs/TextInput';
import ThemeBlock from '../../../ThemeBlock';
import { Close, Search } from '../../../../oracle/icons';

export default {
  title: 'Oracle/Elements/Inputs/TextInput',
  component: TextInput,
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <TextInput {...props} />
  </ThemeBlock>
);

const Template: Story<TextInputProps> = (args) => <TemplateWithTheme {...args} />;

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
  danger: true,
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

export const WithBeforeIconAndLabel = Template.bind({});
WithBeforeIconAndLabel.args = {
  beforeIcon: <Search />,
  label: 'Label',
};

export const Compact = Template.bind({});
Compact.args = {
  ...Regular.args,
  compact: true,
};

export const CompactWithBeforeIcon = Template.bind({});
CompactWithBeforeIcon.args = {
  ...Regular.args,
  beforeIcon: <Search />,
  compact: true,
};

export const CompactWithAfterIcon = Template.bind({});
CompactWithAfterIcon.args = {
  ...Regular.args,
  afterIcon: <Close />,
  compact: true,
};

export const CompactWithBeforeAndAfterIcon = Template.bind({});
CompactWithBeforeAndAfterIcon.args = {
  ...Regular.args,
  afterIcon: <Close />,
  beforeIcon: <Search />,
  compact: true,
};
