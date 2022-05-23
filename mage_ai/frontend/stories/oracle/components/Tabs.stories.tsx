import React from 'react';
import { Meta, Story } from '@storybook/react';

import Spacing from '@oracle/elements/Spacing';
import Tab from '@oracle/components/Tabs/Tab';
import Tabs, { TabsProps } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import ThemeBlock from 'stories/ThemeBlock';
import { Remove } from '@oracle/icons';

export default {
  component: Tabs,
  title: 'Oracle/Components/Tabs',
} as Meta;

// eslint-disable-next-line react/prop-types
const TemplateWithTheme = ({ children, ...props }) => (
  <ThemeBlock>
    <Tabs {...props}>
      {children}
    </Tabs>
  </ThemeBlock>
);

const Template: Story<TabsProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  children: [
    <Tab beforeChildren={<Remove />} key="Tab 1" label="Before icon">
      <Spacing pb={3} pt={3}>
        <Text>
          Before Icon
        </Text>
      </Spacing>
    </Tab>,
    <Tab afterChildren={<Remove />} key="Tab 2" label="After Icon">
      <Spacing pb={3} pt={3}>
        <Text>
          After Icon
        </Text>
      </Spacing>
    </Tab>,
    <Tab key="Tab 3" label="No Icon">
      <Spacing pb={3} pt={3}>
        <Text>
          No Icon
        </Text>
      </Spacing>
    </Tab>,
    <Tab
      beforeChildren={<Remove />}
      disabled
      key="Tab 4"
      label="Disabled"
    >
      <Spacing pb={3} pt={3}>
        <Text>
          Disabled content
        </Text>
      </Spacing>
    </Tab>,
  ],
  defaultKey: 'Tab 1',
};

export const Stretched = Template.bind({});
Stretched.args = {
  ...Regular.args,
  fullWidth: true,
};
