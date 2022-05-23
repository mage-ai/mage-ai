import React from 'react';
import { Meta, Story } from '@storybook/react';

import BreadCrumbs from '@oracle/components/Breadcrumbs';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: BreadCrumbs,
  title: 'Oracle/Components/Breadcrumbs',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <BreadCrumbs breadcrumbs={[]} {...props} />
  </ThemeBlock>
);

const Template: Story<any> = (args) => <TemplateWithTheme {...args} />;

export const Select = Template.bind({});
Select.args = {
  breadcrumbs: [
    {
      label: "Stories",
      selected: true,
    },
  ],
};

export const SelectTwo = Template.bind({});
SelectTwo.args = {
  breadcrumbs: [
    {
      label: "Stories",
    },
    {
      label: "Oracle",
      selected: true,
    },
  ],
};

export const SelectThree = Template.bind({});
SelectThree.args = {
  breadcrumbs: [
    {
      label: "dataset.csv",
    },
    {
      label: "columns",
    },
    {
      label: "features",
      selected: true,
    },
  ],
};
