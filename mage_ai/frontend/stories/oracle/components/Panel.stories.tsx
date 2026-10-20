import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import Panel, { PanelProps } from '@oracle/components/Panel';
import Text from '@oracle/elements/Text';
import ThemeBlock from 'stories/ThemeBlock';
import { Check } from '@oracle/icons';

export default {
  component: Panel,
  title: 'Oracle/Components/Panel',
} as Meta;

const TemplateWithTheme = ({ children, ...props }: PanelProps) => (
  <ThemeBlock>
    <Panel {...props}>
      {children}
    </Panel>
  </ThemeBlock>
);

const Template: StoryFn<PanelProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  children: <Text> 1.00 </Text>,
  headerIcon: <Check />,
  headerTitle: 'Define features',
};

export const Subtitle = Template.bind({});
Subtitle.args = {
  children: <Text> 1.00 </Text>,
  headerTitle: 'Quality Metrics',
  subtitle: <Text disabled large> Good </Text>,
};

export const Footer = Template.bind({});
Footer.args = {
  children: <Text> 1.00 </Text>,
  footer: <Text large>12 results</Text>,
  headerTitle: 'Quality Metrics',
  subtitle: <Text disabled large> Good </Text>,
};

export const Borderless = Template.bind({});
Borderless.args = {
  ...Regular.args,
  borderless: true,
};
