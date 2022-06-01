import React from 'react';
import { Meta, Story } from '@storybook/react';

import ThemeBlock from 'stories/ThemeBlock';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import SimpleDataTableProps from '@oracle/components/Table/SimpleDataTable';

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
      uuid: 'Row 1',
    },
    {
      columnValues: [
        "1", "2", "3", "4", "5",
      ],
      uuid: 'Row 2',
    },
  ],
}

const ColumnHeaderSample = [
  {
    Icon: true,
    label: "Feature 1",
  },
  {
    Icon: true,
    label: "Feature 2",   
  },
  {
    Icon: true,
    label: "Feature 3",
  },
]

const TemplateWithTheme = ({ children, ...props }) => (
  <ThemeBlock>
    <SimpleDataTable 
      columnFlexNumbers={[1,1,1,1,1]}
      columnHeaders={ColumnHeaderSample}
      rowGroupData={[rowGroupDataSample]} 
      {...props}
    />
  </ThemeBlock>
);

const Template: Story<any> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  ...Regular.args,
};
