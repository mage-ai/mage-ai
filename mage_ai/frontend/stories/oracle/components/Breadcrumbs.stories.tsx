import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

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

const Template: StoryFn<any> = (args) => <TemplateWithTheme {...args} />;

export const Select = Template.bind({});
Select.args = {
  breadcrumbs: [
    {
      label: 'Stories',
      selected: true,
    },
  ],
};

export const SelectTwo = Template.bind({});
SelectTwo.args = {
  breadcrumbs: [
    {
      label: 'Stories',
    },
    {
      label: 'Oracle',
      selected: true,
    },
  ],
};

export const SelectThreeLarge = Template.bind({});
SelectThreeLarge.args = {
  breadcrumbs: [
    {
      label: 'columns',
    },
    {
      label: 'features',
    },
    {
      label: 'dataset.csv',
      selected: true,
    },
  ],
  large: true,
};
