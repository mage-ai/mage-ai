import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Spinner, { SpinnerProps } from '@oracle/components/Spinner';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: Spinner,
  title: 'Oracle/Components/Spinner',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Spinner {...props} />
  </ThemeBlock>
);

const Template: StoryFn<SpinnerProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {};

export const Large = Template.bind({});
Large.args = {
  ...Regular.args,
  large: true,
};

export const Small = Template.bind({});
Small.args = {
  ...Regular.args,
  small: true,
};

export const Inverted = Template.bind({});
Inverted.args = {
  ...Regular.args,
  inverted: true,
};
