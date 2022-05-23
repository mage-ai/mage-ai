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
      </Text>
      <Spacing/>
      <Text>
      How do I test this?
      </Text>
      <Spacing/>
      <Text>
      Try resizing the screen!
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

export const Fluid = Template.bind({});
Fluid.args = {
  ...Regular.args,
  fluid: true,
};
