import React from 'react';
import { Meta, Story } from '@storybook/react';

import FlexContainer from '@oracle/components/FlexContainer';
import RowDataTable, { RowDataTableProps } from '@oracle/components/RowDataTable';
import RowCard from '@oracle/components/RowCard';
import Text from '@oracle/elements/Text';
import ThemeBlock from '../../ThemeBlock';
import { Copy } from '@oracle/icons';

export default {
  component: RowDataTable,
  title: 'Oracle/Components/RowDataTable',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    {/*@ts-ignore*/}
    <RowDataTable {...props} />
  </ThemeBlock>
);

const Template: Story<RowDataTableProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  headerTitle: 'datasets',
  headerDetails: '5 datasets',
  children: [
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
    >
      <FlexContainer alignItems="center">
        <Copy primary />&nbsp;
        <Text>dataset_A</Text>
      </FlexContainer>
      <Text>12 features</Text>
      <Text>1,000 rows</Text>
      <Text bold danger>Bad</Text>
    </RowCard>,
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
      secondary
    >
      <Text>dataset_B</Text>
      <Text>52 features</Text>
      <Text>100 rows</Text>
      <Text bold danger>Bad</Text>
    </RowCard>,
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
    >
      <Text>dataset_C</Text>
      <Text>112 features</Text>
      <Text>799 rows</Text>
      <Text>Good</Text>
    </RowCard>,
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
      secondary
    >
      <Text>dataset_D</Text>
      <Text>2 features</Text>
      <Text>100,000 rows</Text>
      <Text>Good</Text>
    </RowCard>,
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
      last
    >
      <Text>dataset_E</Text>
      <Text>1 feature</Text>
      <Text>100 rows</Text>
      <Text bold danger>Bad</Text>
    </RowCard>
  ],
};
