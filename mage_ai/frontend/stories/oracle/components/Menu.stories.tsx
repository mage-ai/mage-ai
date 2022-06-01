import React from 'react';
import { Meta, Story } from '@storybook/react';

import Menu, { MenuProps } from '@oracle/components/Menu';
import ThemeBlock from 'stories/ThemeBlock';

export default {
  component: Menu,
  title: 'Oracle/Components/Menu',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    <Menu {...props} />
  </ThemeBlock>
);

const Template: Story<MenuProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  linkGroups: [
    {
      links: [
        {
          label: 'Filter rows',
          uuid: 'filter_rows',
        },
        {
          label: 'Drop duplicates',
          uuid: 'drop_duplicates',
        },
      ],
      uuid: 'row',
    },
    {
      links: [
        {
          label: 'Remove columns',
          uuid: 'remove_columns',
        },
        {
          label: 'Reformat value',
          uuid: 'reformat_values',
        },
        {
          label: 'Fill in missing values',
          uuid: 'impute',
        },
        {
          label: 'Clean column names',
          uuid: 'clean',
        },
      ],
      uuid: 'column',
    },
  ],
};
