import React from 'react';
import { Meta, Story } from '@storybook/react';

import BreadCrumbs from '@oracle/components/Breadcrumbs';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: BreadCrumbs,
  title: 'Oracle/Components/Breadcrumbs',
} as Meta;

const breadcrumbs:any = [];

breadcrumbs.push({
  label: "Storybook",
});

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
   <BreadCrumbs breadcrumbs={[]} {...props} />
  </ThemeBlock>
);

const Template: Story<any> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  breadcrumbs: [
    {
      label: "one",
    },
    {
      label: "two",
    },
  ],    
};