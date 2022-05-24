import React from 'react';
import { Meta, Story } from '@storybook/react';

import ThemeBlock from 'stories/ThemeBlock';
import SimpleDataTable, { SimpleDataTableProps } from '@oracle/components/Table/SimpleDataTable';

export default {
  component: SimpleDataTable,
  title: 'Oracle/Components/SimpleDataTable',
} as Meta;

const rowGroupDataSample = {
  rowData: [
    {
      columnValues: [
        "1", "2", "3", "4", "5",
      ],
      uuid: 'column',
    },
    {
      columnValues: [
        "1", "2", "3", "4", "5",
      ],
      uuid: 'column 2',
    },
  ],
  title: 'storybook',
}

// eslint-disable-next-line react/prop-types
const TemplateWithTheme = ({ children, ...props }) => (
  <ThemeBlock>
    <SimpleDataTable 
      columnFlexNumbers={[1,1,1,1,1]}
      columnHeaders={["Feature", "Feature 2", "Feature 3", "feature 4", "feature 5"]}
      rowGroupData={[rowGroupDataSample]} 
      {...props}>
      {children}
    </SimpleDataTable>
  </ThemeBlock>
);

const Template: Story<SimpleDataTableProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  ...Regular.args,
  selectedRowIndexes: [2],
};
