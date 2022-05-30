import React from 'react';
import { Meta, Story } from '@storybook/react';

import BreadCrumbs from '@oracle/components/Breadcrumbs';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: BreadCrumbs,
  title: 'Oracle/Components/Breadcrumbs/Breadcrumbs',
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

export const SelectThreeXL = Template.bind({});
SelectThreeXL.args = {
  breadcrumbs: [
    {
      label: "dataset.csv",
      xlarge: true,
    },
    {
      label: "columns",
      xlarge: true,
    },
    {
      label: "features",
      selected: true,
      xlarge: true,
    },
  ],
};
