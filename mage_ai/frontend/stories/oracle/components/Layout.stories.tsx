import React from 'react';
import { Meta, Story } from '@storybook/react';

import Layout, { LayoutProps } from '@oracle/components/Layout';
import Text from '@oracle/elements/Text';
import Spacing from '@oracle/elements/Spacing';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: Layout,
  title: 'Oracle/Components/Layout',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Layout {...props} >
      <Text>
      Hello world!
      What do I put in here exactly?
      <Spacing/>
      How do I test this?
      </Text>
      <Spacing/>
    </Layout>
  </ThemeBlock>
);

const Template: Story<LayoutProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {};

export const CenterAlign = Template.bind({});
CenterAlign.args = {
  ...Regular.args,
  centerAlign: true,
};

export const Footer = Template.bind({});
Footer.args = {
  ...Regular.args,
  footer: {
    value :"bye",
  },
};