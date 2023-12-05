import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

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

const Template: StoryFn<RowDataTableProps> = (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});
Regular.args = {
  header: (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <Text bold default>
        Datasets
      </Text>
      <Text>
        5 datasets
      </Text>
    </FlexContainer>
  ),
  footer: (
    <FlexContainer alignItems="center" justifyContent="center">
      <Text>
        View more
      </Text>
    </FlexContainer>
  ),
  children: [
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
      key={1}
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
      key={2}
      secondary
    >
      <Text>dataset_B</Text>
      <Text>52 features</Text>
      <Text>100 rows</Text>
      <Text bold danger>Bad</Text>
    </RowCard>,
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
      key={3}
    >
      <Text>dataset_C</Text>
      <Text>112 features</Text>
      <Text>799 rows</Text>
      <Text>Good</Text>
    </RowCard>,
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
      key={4}
      secondary
    >
      <Text>dataset_D</Text>
      <Text>2 features</Text>
      <Text>100,000 rows</Text>
      <Text>Good</Text>
    </RowCard>,
    <RowCard
      columnFlexNumbers={[4, 1, 1, 1]}
      key={5}
      last
    >
      <Text>dataset_E</Text>
      <Text>1 feature</Text>
      <Text>100 rows</Text>
      <Text bold danger>Bad</Text>
    </RowCard>,
  ],
};
