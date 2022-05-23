import React from 'react';
import { Meta, Story } from '@storybook/react';

import Breadcrumb, { BreadcrumbType } from '@oracle/components/Breadcrumbs/Breadcrumb';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: Breadcrumb,
  title: 'Oracle/Components/Breadcrumb',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Breadcrumb label={'Storybook'} {...props} />
  </ThemeBlock>
);

const Template: Story<BreadcrumbType> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {};

export const XLarge = Template.bind({});
XLarge.args = {
  ...Regular.args,
  xlarge: true,
};

export const Selected = Template.bind({});
Selected.args = {
  ...Regular.args,
  selected: true,
};
