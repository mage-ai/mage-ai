import React from 'react';
import { Meta, Story } from '@storybook/react';

import FileTree, { FileTreeProps } from '@components/FileTree';
import ThemeBlock from '../../ThemeBlock';

export default {
  component: FileTree,
  title: 'Components/Panels/FileTree',
} as Meta;

const TemplateWithTheme = ({ ...props }) => (
  <ThemeBlock>
    {/*@ts-ignore*/}
    <FileTree {...props} />
  </ThemeBlock>
);

const Template: Story<FileTreeProps> =
  (args) => <TemplateWithTheme {...args} />;

export const Regular = Template.bind({});

const TEST_FILE_TREE = [
  {
    children: [
      {
        name: '__init__.py',
      },
      {
        name: 'requirements.txt',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            children: [
              {
                name: '__init__.py',
              },
              {
                name: 'metadata.json',
              },
              {
                name: 'requirements.txt',
              },
            ],
            name: 'prepare_sales_data',
          },
        ],
        name: 'pipelines',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'upload_to_s3.py',
          },
        ],
        name: 'exporters',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'sales_data.py',
          },
        ],
        name: 'data_loaders',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'summary_statistics.py',
          },
        ],
        name: 'global_variables',
      },
      {
        children: [
          {
            name: '__init__.py',
          },
          {
            name: 'average_purchase_price.py',
          },
        ],
        name: 'transformers',
      },
      {
        children: [],
        name: 'scratchpad',
      },
    ],
    name: 'demo_project',
  },
];

Regular.args = {
  tree: TEST_FILE_TREE,
};
